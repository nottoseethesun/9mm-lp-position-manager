/**
 * @file src/server-positions.js
 * @module server-positions
 * @description
 * Multi-position management route handlers and state helpers for the server.
 * Extracted from server.js to stay within the 500-line limit.
 *
 * Provides:
 *  - Per-position bot state creation and update
 *  - API route handlers: manage, pause, resume, remove, list
 *  - Composite key migration after rebalance
 */

'use strict';

const config = require('./config');
const { startBotLoop } = require('./bot-loop');
const {
  compositeKey, parseCompositeKey, saveConfig,
  getPositionConfig, addManagedPosition, removeManagedPosition,
  migratePositionKey: migrateConfigKey,
} = require('./bot-config-v2');

/** Per-position bot state (in-memory, keyed by composite key). */
const _positionBotStates = new Map();

/**
 * Create a fresh per-position bot state with defaults + saved config.
 * @param {object} globalCfg  Global config section from v2 disk config.
 * @param {object} [saved]    Saved position config from disk.
 * @returns {object}
 */
function createPerPositionBotState(globalCfg, saved) {
  const state = {
    running: false, startedAt: null,
    slippagePct: globalCfg.slippagePct ?? config.SLIPPAGE_PCT,
    checkIntervalSec: globalCfg.checkIntervalSec ?? config.CHECK_INTERVAL_SEC,
    minRebalanceIntervalMin: globalCfg.minRebalanceIntervalMin ?? config.MIN_REBALANCE_INTERVAL_MIN,
    maxRebalancesPerDay: globalCfg.maxRebalancesPerDay ?? config.MAX_REBALANCES_PER_DAY,
    gasStrategy: globalCfg.gasStrategy || 'auto',
    triggerType: globalCfg.triggerType || 'oor',
    activePosition: null,
    rebalanceCount: 0, lastRebalanceAt: null,
    rebalanceError: null, rebalancePaused: false,
    rebalanceScanComplete: false, rebalanceScanProgress: 0,
  };
  if (saved) {
    if (saved.rebalanceOutOfRangeThresholdPercent !== undefined) state.rebalanceOutOfRangeThresholdPercent = saved.rebalanceOutOfRangeThresholdPercent;
    else state.rebalanceOutOfRangeThresholdPercent = config.REBALANCE_OOR_THRESHOLD_PCT;
    if (saved.rebalanceTimeoutMin !== undefined) state.rebalanceTimeoutMin = saved.rebalanceTimeoutMin;
    else state.rebalanceTimeoutMin = config.REBALANCE_TIMEOUT_MIN;
    if (saved.pnlEpochs) state.pnlEpochs = saved.pnlEpochs;
    if (saved.hodlBaseline) state.hodlBaseline = saved.hodlBaseline;
    if (saved.residuals) state.residuals = saved.residuals;
    if (saved.collectedFeesUsd) state.collectedFeesUsd = saved.collectedFeesUsd;
  } else {
    state.rebalanceOutOfRangeThresholdPercent = config.REBALANCE_OOR_THRESHOLD_PCT;
    state.rebalanceTimeoutMin = config.REBALANCE_TIMEOUT_MIN;
  }
  return state;
}

/**
 * Update per-position state and persist when needed.
 * @param {string} key          Composite key.
 * @param {object} patch        State patch from the bot loop.
 * @param {object} diskConfig   V2 disk config (mutated + saved).
 * @param {object} positionMgr  Position manager instance.
 */
function updatePositionState(key, patch, diskConfig, positionMgr) {
  let state = _positionBotStates.get(key);
  if (!state) { state = {}; _positionBotStates.set(key, state); }
  Object.assign(state, patch, { updatedAt: new Date().toISOString() });

  // Persist position-specific data to v2 config
  const shouldPersist = patch.pnlEpochs || patch.hodlBaseline || patch.residuals
    || patch.collectedFeesUsd !== undefined || patch.activePositionId;
  if (shouldPersist) {
    const pos = getPositionConfig(diskConfig, key);
    if (patch.pnlEpochs) pos.pnlEpochs = patch.pnlEpochs;
    if (patch.hodlBaseline) pos.hodlBaseline = patch.hodlBaseline;
    if (patch.residuals) pos.residuals = patch.residuals;
    if (patch.collectedFeesUsd !== undefined) pos.collectedFeesUsd = patch.collectedFeesUsd;
    saveConfig(diskConfig);
  }

  // Handle key migration after rebalance (new tokenId)
  const parsed = parseCompositeKey(key);
  if (patch.activePositionId && String(patch.activePositionId) !== parsed.tokenId) {
    const newKey = compositeKey(parsed.blockchain, parsed.wallet, parsed.contract, String(patch.activePositionId));
    positionMgr.migrateKey(key, newKey, String(patch.activePositionId));
    migrateConfigKey(diskConfig, key, newKey);
    _positionBotStates.set(newKey, state);
    _positionBotStates.delete(key);
    saveConfig(diskConfig);
  }
}

/**
 * Get a per-position bot state by key.
 * @param {string} key  Composite key.
 * @returns {object|undefined}
 */
function getPositionBotState(key) { return _positionBotStates.get(key); }

/**
 * Get all per-position bot states.
 * @returns {Map<string, object>}
 */
function getAllPositionBotStates() { return _positionBotStates; }

/**
 * Create route handlers for multi-position management.
 * @param {object} deps
 * @param {object} deps.diskConfig     V2 disk config.
 * @param {object} deps.positionMgr    Position manager instance.
 * @param {object} deps.walletManager  Wallet manager instance.
 * @param {Function} deps.getPrivateKey  Returns resolved private key.
 * @param {Function} deps.jsonResponse   JSON response helper.
 * @param {Function} deps.readJsonBody   JSON body reader.
 * @returns {object}  Map of route key → handler.
 */
function createPositionRoutes(deps) {
  const { diskConfig, positionMgr, walletManager, getPrivateKey, jsonResponse, readJsonBody } = deps;

  async function handleManage(req, res) {
    const body = await readJsonBody(req);
    if (!body.tokenId) { jsonResponse(res, 400, { ok: false, error: 'Missing tokenId' }); return; }
    const blockchain = body.blockchain || 'pulsechain';
    const contract = body.contract || config.POSITION_MANAGER;
    const wallet = walletManager.getAddress();
    if (!wallet) { jsonResponse(res, 400, { ok: false, error: 'No wallet loaded' }); return; }
    const pk = getPrivateKey();
    if (!pk) { jsonResponse(res, 400, { ok: false, error: 'No private key available' }); return; }
    const key = compositeKey(blockchain, wallet, contract, String(body.tokenId));

    addManagedPosition(diskConfig, key);
    saveConfig(diskConfig);

    const posConfig = getPositionConfig(diskConfig, key);
    const posBotState = createPerPositionBotState(diskConfig.global, posConfig);
    _positionBotStates.set(key, posBotState);

    await positionMgr.startPosition(key, {
      tokenId: String(body.tokenId),
      startLoop: () => startBotLoop({
        privateKey: pk, dryRun: config.DRY_RUN,
        updateBotState: (patch) => updatePositionState(key, patch, diskConfig, positionMgr),
        botState: posBotState, positionId: String(body.tokenId),
      }),
      savedConfig: posConfig,
    });

    jsonResponse(res, 200, { ok: true, key, tokenId: String(body.tokenId) });
  }

  async function handlePause(req, res) {
    const body = await readJsonBody(req);
    if (!body.key) { jsonResponse(res, 400, { ok: false, error: 'Missing key' }); return; }
    await positionMgr.pausePosition(body.key);
    const pos = getPositionConfig(diskConfig, body.key);
    pos.status = 'paused';
    saveConfig(diskConfig);
    jsonResponse(res, 200, { ok: true, key: body.key, status: 'paused' });
  }

  async function handleResume(req, res) {
    const body = await readJsonBody(req);
    if (!body.key) { jsonResponse(res, 400, { ok: false, error: 'Missing key' }); return; }
    const posConfig = getPositionConfig(diskConfig, body.key);
    const entry = positionMgr.get(body.key);
    if (!entry) { jsonResponse(res, 404, { ok: false, error: 'Position not found' }); return; }
    const pk = getPrivateKey();
    if (!pk) { jsonResponse(res, 400, { ok: false, error: 'No private key available' }); return; }

    const posBotState = createPerPositionBotState(diskConfig.global, posConfig);
    _positionBotStates.set(body.key, posBotState);

    await positionMgr.resumePosition(body.key, () => startBotLoop({
      privateKey: pk, dryRun: config.DRY_RUN,
      updateBotState: (patch) => updatePositionState(body.key, patch, diskConfig, positionMgr),
      botState: posBotState, positionId: entry.tokenId,
    }));

    posConfig.status = 'running';
    saveConfig(diskConfig);
    jsonResponse(res, 200, { ok: true, key: body.key, status: 'running' });
  }

  async function handleRemove(req, res) {
    const body = await readJsonBody(req);
    if (!body.key) { jsonResponse(res, 400, { ok: false, error: 'Missing key' }); return; }
    await positionMgr.removePosition(body.key);
    removeManagedPosition(diskConfig, body.key);
    saveConfig(diskConfig);
    _positionBotStates.delete(body.key);
    jsonResponse(res, 200, { ok: true, key: body.key, status: 'stopped' });
  }

  function handleManagedList(_req, res) {
    const all = positionMgr.getAll();
    // Attach per-position bot state summaries
    const positions = all.map((p) => {
      const bs = _positionBotStates.get(p.key);
      return { ...p, ...(bs ? { activePosition: bs.activePosition, running: bs.running } : {}) };
    });
    jsonResponse(res, 200, {
      ok: true, positions,
      dailyRebalanceCount: positionMgr.getDailyCount(),
    });
  }

  return {
    'POST /api/position/manage':  handleManage,
    'POST /api/position/pause':   handlePause,
    'POST /api/position/resume':  handleResume,
    'DELETE /api/position/manage': handleRemove,
    'GET /api/positions/managed':  handleManagedList,
  };
}

module.exports = {
  createPerPositionBotState,
  updatePositionState,
  getPositionBotState,
  getAllPositionBotStates,
  createPositionRoutes,
};
