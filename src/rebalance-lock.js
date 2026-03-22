/**
 * @file src/rebalance-lock.js
 * @module rebalance-lock
 * @description
 * Async mutex for nonce-safe sequential rebalancing across multiple positions
 * sharing the same wallet.  Only one position can execute transactions at a
 * time (same wallet = same nonce).  Other positions continue polling and
 * computing P&L while queued for the lock.
 *
 * No timeout-based release — blockchains can hold a TX pending for days.
 * A timeout would free the lock while the nonce is still occupied, causing
 * every subsequent TX to fail with "could not replace existing tx."  The
 * lock holder is responsible for speed-up or 0-value self-cancel before
 * releasing.
 *
 * @example
 * const lock = createRebalanceLock();
 * const release = await lock.acquire();
 * try { await sendTx(); } finally { release(); }
 */

'use strict';

/**
 * Create a rebalance lock (async mutex).
 *
 * @returns {{ acquire: () => Promise<() => void>, pending: () => number }}
 */
function createRebalanceLock() {
  const _queue = [];   // waiting callers (resolve functions)
  let _locked = false;

  /**
   * Acquire the lock.  Resolves with a release function once it's this
   * caller's turn.  Callers queue in FIFO order.
   * @returns {Promise<() => void>}  Call the returned function to release.
   */
  function acquire() {
    const release = () => {
      const next = _queue.shift();
      if (next) {
        next(release);
      } else {
        _locked = false;
      }
    };

    if (!_locked) {
      _locked = true;
      return Promise.resolve(release);
    }

    return new Promise((resolve) => { _queue.push(resolve); });
  }

  /**
   * Number of callers currently waiting to acquire the lock (not including
   * the current holder).
   * @returns {number}
   */
  function pending() { return _queue.length; }

  return { acquire, pending };
}

module.exports = { createRebalanceLock };
