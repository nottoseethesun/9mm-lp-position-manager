/**
 * @file position-details-compound.js
 * @description Compound-detection helpers for the unmanaged-position
 *   details flow. Extracted from position-details.js to keep that file
 *   under the 500-line cap. Provides:
 *   - _scanCompounds: full chain scan returning { total, current }
 *   - _detectCurrentNftCompounded: cheap one-NFT scan for current value
 *   - _resolveCompounded: cache-first wrapper used by computeLifetimeDetails
 */

"use strict";

const config = require("./config");
const { getPositionConfig, saveConfig } = require("./bot-config-v2");
const { detectCompoundsOnChain } = require("./compounder");

/**
 * Detect compounds across all NFTs in the rebalance chain and cache result.
 * `_detect` is injectable for tests; defaults to the production scanner.
 * Returns `{ total, current }` — total is lifetime across the chain;
 * current is the current NFT's own compounded value (used by the
 * Current panel's "Fees Compounded" row).
 */
async function _scanCompounds(
  position,
  events,
  body,
  ps,
  prices,
  diskConfig,
  posKey,
  dir,
  _detect = detectCompoundsOnChain,
) {
  try {
    const ids = new Set([String(position.tokenId)]);
    for (const e of events) {
      if (e.oldTokenId) ids.add(String(e.oldTokenId));
      if (e.newTokenId) ids.add(String(e.newTokenId));
    }
    const opts = {
      positionManagerAddress: config.POSITION_MANAGER,
      token0: position.token0,
      token1: position.token1,
      fee: position.fee,
      walletAddress: body.walletAddress,
      price0: prices.price0,
      price1: prices.price1,
      decimals0: ps.decimals0,
      decimals1: ps.decimals1,
    };
    /*- total = lifetime collected fees across the rebalance chain
     *  (Lifetime panel "Fees Compounded"). current = sum of standalone
     *  compound deposit values for the current NFT only (Current panel
     *  "Fees Compounded") — matches bot-recorder-lifetime's compound-
     *  History/usdValue model so managed and unmanaged agree. */
    let total = 0;
    let current = 0;
    const curId = String(position.tokenId);
    for (const tid of ids) {
      const r = await _detect(tid, opts);
      total += r.totalCompoundedUsd;
      if (tid === curId)
        current = (r.compounds || []).reduce(
          (s, c) => s + (c.usdValue || 0),
          0,
        );
    }
    if (total > 0) {
      getPositionConfig(diskConfig, posKey).totalCompoundedUsd = total;
      saveConfig(diskConfig, dir);
    }
    return { total, current };
  } catch (e) {
    console.warn("[position details] compound detection failed:", e.message);
    return { total: 0, current: 0 };
  }
}

/** Detect compounded USD for the current NFT only (one cheap RPC scan). */
async function _detectCurrentNftCompounded(
  position,
  body,
  ps,
  prices,
  _detect = detectCompoundsOnChain,
) {
  try {
    const opts = {
      positionManagerAddress: config.POSITION_MANAGER,
      token0: position.token0,
      token1: position.token1,
      fee: position.fee,
      walletAddress: body.walletAddress,
      price0: prices.price0,
      price1: prices.price1,
      decimals0: ps.decimals0,
      decimals1: ps.decimals1,
    };
    const r = await _detect(String(position.tokenId), opts);
    return (r.compounds || []).reduce((s, c) => s + (c.usdValue || 0), 0);
  } catch (e) {
    console.warn(
      "[position details] current-NFT compound detection failed:",
      e.message,
    );
    return 0;
  }
}

/*- Resolve compounded USD from disk cache or chain scan.  Returns
 *  `{ total, current }`: total is the lifetime compounded across the
 *  rebalance chain (used by the Lifetime panel); current is the
 *  current NFT's own compounded fees (used by the Current panel's
 *  "Fees Compounded" row, which would otherwise read $0 / dash on
 *  unmanaged positions even when the value is material). */
async function _resolveCompounded(
  position,
  events,
  body,
  ps,
  prices,
  diskConfig,
  posKey,
) {
  const posConfig = diskConfig.positions[posKey] || {};
  if (posConfig.totalCompoundedUsd) {
    /*- Cache hit on the lifetime total — still need a one-NFT scan
     *  for the current value (not cached on disk; per-tokenId scan is
     *  cheap, ~1 RPC call vs the full chain scan for the cold path). */
    const current = await _detectCurrentNftCompounded(
      position,
      body,
      ps,
      prices,
    );
    return { total: posConfig.totalCompoundedUsd, current };
  }
  if (events.length === 0) return { total: 0, current: 0 };
  return _scanCompounds(position, events, body, ps, prices, diskConfig, posKey);
}

module.exports = {
  _scanCompounds,
  _detectCurrentNftCompounded,
  _resolveCompounded,
};
