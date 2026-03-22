/**
 * @file src/position-manager.js
 * @module position-manager
 * @description
 * Central orchestrator for managing multiple LP positions simultaneously.
 * Each managed position gets its own independent `startBotLoop()` instance
 * sharing a single wallet (provider + signer).  A rebalance lock serializes
 * on-chain transactions so only one position rebalances at a time (same
 * wallet = same nonce).
 *
 * Functional API — no classes, no mutable singleton state.  Call
 * `createPositionManager(opts)` to get a handle with start/stop/pause/resume.
 *
 * @example
 * const mgr = createPositionManager({ signer, provider, ethersLib, rebalanceLock });
 * await mgr.startPosition(compositeKey, { tokenId, botState, updateBotState });
 * mgr.getAll();  // → Map of managed positions
 */

'use strict';

const { nextMidnight } = require('./throttle');

/**
 * @typedef {Object} ManagedPosition
 * @property {string}   key       Composite key (blockchain-wallet-contract-tokenId).
 * @property {string}   tokenId   NFT token ID.
 * @property {string}   status    'running' | 'paused' | 'stopped'
 * @property {{ stop: Function }} [handle]  Bot loop handle (null when paused).
 */

/**
 * Create a position manager.
 *
 * @param {object} opts
 * @param {object}   opts.rebalanceLock   Lock from createRebalanceLock().
 * @param {number}   [opts.dailyMax=20]   Wallet-level daily rebalance cap.
 * @param {Function} [opts.nowFn]         Injectable clock (for testing).
 * @returns {object}  Position manager handle.
 */
function createPositionManager(opts) {
  const { dailyMax = 20, nowFn } = opts;
  const _rebalanceLock = opts.rebalanceLock;

  /** @type {Map<string, ManagedPosition>} */
  const _positions = new Map();

  /** Wallet-level daily rebalance counter (shared across all positions). */
  let _dailyCount = 0;
  const _clock = nowFn || Date.now;
  let _dailyResetAt = nextMidnight(_clock);

  /** Reset daily counter at midnight UTC. */
  function _tickDaily() {
    if (_clock() >= _dailyResetAt) {
      _dailyCount = 0;
      _dailyResetAt = nextMidnight(_clock);
    }
  }

  /**
   * Check whether the wallet-level daily cap allows another rebalance.
   * @returns {boolean}
   */
  function canRebalanceDaily() {
    _tickDaily();
    return _dailyCount < dailyMax;
  }

  /** Record a wallet-level rebalance (called after successful TX). */
  function recordDailyRebalance() {
    _dailyCount++;
  }

  /**
   * Start managing a position.
   *
   * @param {string} key               Composite key.
   * @param {object} posOpts
   * @param {string}   posOpts.tokenId    NFT token ID.
   * @param {Function} posOpts.startLoop  Async function that starts the bot loop.
   *   Returns `{ stop() }`.  The caller (server-positions.js) is responsible
   *   for wiring up the bot state and dependencies.
   * @param {object}   [posOpts.savedConfig]  Saved position config from disk.
   * @returns {Promise<void>}
   */
  async function startPosition(key, posOpts) {
    const { tokenId, startLoop } = posOpts;

    if (_positions.has(key) && _positions.get(key).status === 'running') {
      console.log('[pos-mgr] Position %s already running', key);
      return;
    }

    const handle = await startLoop();

    _positions.set(key, { key, tokenId, status: 'running', handle });
    console.log('[pos-mgr] Started position %s (tokenId=%s)', key, tokenId);
  }

  /**
   * Pause a managed position (stop loop, retain config for resume).
   * @param {string} key  Composite key.
   * @returns {Promise<void>}
   */
  async function pausePosition(key) {
    const entry = _positions.get(key);
    if (!entry) { console.warn('[pos-mgr] Cannot pause unknown position %s', key); return; }
    if (entry.status === 'paused') return;

    if (entry.handle) await entry.handle.stop();
    entry.handle = null;
    entry.status = 'paused';
    console.log('[pos-mgr] Paused position %s', key);
  }

  /**
   * Resume a paused position.
   * @param {string}   key        Composite key.
   * @param {Function} startLoop  Same signature as startPosition's startLoop.
   * @returns {Promise<void>}
   */
  async function resumePosition(key, startLoop) {
    const entry = _positions.get(key);
    if (!entry) { console.warn('[pos-mgr] Cannot resume unknown position %s', key); return; }
    if (entry.status === 'running') return;

    const handle = await startLoop();

    entry.handle = handle;
    entry.status = 'running';
    console.log('[pos-mgr] Resumed position %s', key);
  }

  /**
   * Stop and remove a position from management.
   * @param {string} key  Composite key.
   * @returns {Promise<void>}
   */
  async function removePosition(key) {
    const entry = _positions.get(key);
    if (!entry) return;
    if (entry.handle) await entry.handle.stop();
    _positions.delete(key);
    console.log('[pos-mgr] Removed position %s', key);
  }

  /**
   * Stop all managed positions.
   * @returns {Promise<void>}
   */
  async function stopAll() {
    const stops = [];
    for (const [, entry] of _positions) {
      if (entry.handle) stops.push(entry.handle.stop());
    }
    await Promise.all(stops);
    for (const [, entry] of _positions) {
      entry.handle = null;
      entry.status = 'stopped';
    }
    console.log('[pos-mgr] All positions stopped');
  }

  /**
   * Update a position's composite key after rebalance mints a new NFT.
   * @param {string} oldKey  Previous composite key.
   * @param {string} newKey  New composite key.
   * @param {string} newTokenId  New NFT token ID.
   */
  function migrateKey(oldKey, newKey, newTokenId) {
    if (oldKey === newKey) return;
    const entry = _positions.get(oldKey);
    if (!entry) return;
    _positions.delete(oldKey);
    entry.key = newKey;
    entry.tokenId = newTokenId;
    _positions.set(newKey, entry);
    console.log('[pos-mgr] Migrated key %s → %s', oldKey, newKey);
  }

  /**
   * Get all managed positions with their status.
   * @returns {Array<{ key: string, tokenId: string, status: string }>}
   */
  function getAll() {
    return Array.from(_positions.values()).map(({ key, tokenId, status }) => ({
      key, tokenId, status,
    }));
  }

  /**
   * Get a single managed position by key.
   * @param {string} key  Composite key.
   * @returns {ManagedPosition|undefined}
   */
  function get(key) { return _positions.get(key); }

  /** Number of currently managed positions. */
  function count() { return _positions.size; }

  /** Number of currently running positions. */
  function runningCount() {
    let n = 0;
    for (const [, e] of _positions) if (e.status === 'running') n++;
    return n;
  }

  /** Current daily rebalance count (wallet-level). */
  function getDailyCount() { _tickDaily(); return _dailyCount; }

  /** The shared rebalance lock (for callers that need nonce-safe TX serialization). */
  function getRebalanceLock() { return _rebalanceLock; }

  return {
    startPosition,
    pausePosition,
    resumePosition,
    removePosition,
    stopAll,
    migrateKey,
    getAll,
    get,
    count,
    runningCount,
    getDailyCount,
    canRebalanceDaily,
    recordDailyRebalance,
    getRebalanceLock,
  };
}

module.exports = { createPositionManager };
