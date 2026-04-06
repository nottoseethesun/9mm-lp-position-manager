/**
 * @file dashboard-data-cache.js
 * @description Rebalance event localStorage cache and config input dirty-flag
 *   management. Extracted from dashboard-data.js for line-count compliance.
 */

import { compositeKey } from "./dashboard-helpers.js";
import { posStore } from "./dashboard-positions-store.js";

// ── Rebalance event cache ────────────────────────────────────────────────────

const _REB_CACHE_KEY = "9mm_rebalance_events_cache";

function _rebPosKey() {
  const a = posStore.getActive();
  return a?.walletAddress && a?.contractAddress
    ? compositeKey("pulsechain", a.walletAddress, a.contractAddress, a.tokenId)
    : null;
}

export function cacheRebalanceEvents(events) {
  const pk = _rebPosKey();
  if (!pk) return;
  try {
    const r = localStorage.getItem(_REB_CACHE_KEY);
    const c = r ? JSON.parse(r) : {};
    c[pk] = events;
    localStorage.setItem(_REB_CACHE_KEY, JSON.stringify(c));
  } catch {
    /* */
  }
}

export function loadCachedRebalanceEvents() {
  const pk = _rebPosKey();
  if (!pk) return null;
  try {
    const r = localStorage.getItem(_REB_CACHE_KEY);
    const e = r ? JSON.parse(r)[pk] : null;
    return Array.isArray(e) ? e : null;
  } catch {
    return null;
  }
}

// ── Config input dirty-flag cache ────────────────────────────────────────────

/**
 * Dirty-flag cache for form inputs being edited by the user.
 * Key: fully-qualified string (blockchain-wallet-contract-tokenId-elementId).
 * Value: "EDITED" while the user has changed the input.
 * Cleared at the end of each poll cycle so future polls resume writing.
 */
const _dirtyInputs = new Map();

/** Mark a form input as dirty (user-edited). Skips poll overwrites this cycle. */
export function markInputDirty(elementId) {
  const active = posStore.getActive();
  if (!active) return;
  const key = `pulsechain-${active.walletAddress}-${active.contractAddress}-${active.tokenId}-${elementId}`;
  _dirtyInputs.set(key, "EDITED");
}

/** Check if a form input is dirty. */
export function isInputDirty(elementId) {
  const active = posStore.getActive();
  if (!active) return false;
  const key = `pulsechain-${active.walletAddress}-${active.contractAddress}-${active.tokenId}-${elementId}`;
  return _dirtyInputs.has(key);
}

/** Clear all dirty flags (called at end of each poll cycle). */
export function clearDirtyInputs() {
  _dirtyInputs.clear();
}
