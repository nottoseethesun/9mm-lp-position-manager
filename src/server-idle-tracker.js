/**
 * @file src/server-idle-tracker.js
 * @module server-idle-tracker
 * @description
 * Server-side idle detection for the idle-driven price-lookup pause
 * (component 1 of 4 — see docs/architecture.md "Idle-Driven Price-Lookup
 * Pause").  Catches the "dashboard fully closed" case: when no `/api/*`
 * traffic has hit the server for `thresholdMs`, fires `onIdle()` once.
 *
 * `markActivity()` is called on every `/api/*` request and resets the
 * idle countdown.  It does NOT clear an existing pause flag — unpausing
 * is always explicit (browser endpoint or move scope).  This is the
 * load-bearing rule that keeps the 3-second `/api/status` poll from
 * fighting the browser-issued pause.
 */

"use strict";

/**
 * @typedef {Object} IdleTrackerOpts
 * @property {number}   thresholdMs       Idle window in ms.
 * @property {number}   checkIntervalMs   How often to check the window.
 * @property {Function} onIdle            Fires once when idle threshold first crossed.
 * @property {Function} [nowFn]           Clock injection for tests; defaults to Date.now.
 */

/**
 * Build a stateful idle tracker with `start()` / `stop()` /
 * `markActivity()` / `getState()`.
 *
 * @param {IdleTrackerOpts} opts
 * @returns {{
 *   start: () => void,
 *   stop: () => void,
 *   markActivity: () => void,
 *   getState: () => { lastActivityTs: number, paused: boolean, running: boolean },
 * }}
 */
function createIdleTracker({
  thresholdMs,
  checkIntervalMs,
  onIdle,
  nowFn = Date.now,
}) {
  if (!Number.isFinite(thresholdMs) || thresholdMs <= 0)
    throw new Error("createIdleTracker: thresholdMs must be > 0");
  if (!Number.isFinite(checkIntervalMs) || checkIntervalMs <= 0)
    throw new Error("createIdleTracker: checkIntervalMs must be > 0");
  if (typeof onIdle !== "function")
    throw new Error("createIdleTracker: onIdle must be a function");

  let _lastActivityTs = nowFn();
  let _paused = false;
  let _interval = null;

  function markActivity() {
    _lastActivityTs = nowFn();
    /*- Note: does NOT clear `_paused`.  Unpausing is always explicit
     *  via the browser endpoint or move-scoped override — see plan
     *  "ordinary /api/* traffic does NOT auto-unpause". */
  }

  function _check() {
    if (_paused) return;
    if (nowFn() - _lastActivityTs < thresholdMs) return;
    _paused = true;
    try {
      onIdle();
    } catch (err) {
      console.warn("[idle-tracker] onIdle threw: %s", err.message ?? err);
    }
  }

  function start() {
    if (_interval) return;
    _interval = setInterval(_check, checkIntervalMs);
    /*- Don't keep the event loop alive purely for this timer — the
     *  HTTP server itself holds the loop open in production.  This
     *  prevents the timer from blocking process exit during tests. */
    if (_interval && typeof _interval.unref === "function") _interval.unref();
  }

  function stop() {
    if (_interval) clearInterval(_interval);
    _interval = null;
  }

  function getState() {
    return {
      lastActivityTs: _lastActivityTs,
      paused: _paused,
      running: _interval !== null,
    };
  }

  /*- Test-only: reset the internal `_paused` flag.  Production never
   *  needs to clear this — once idle, the tracker stays "paused" until
   *  the next `start()`/`stop()` cycle (which itself only happens at
   *  server lifecycle boundaries). */
  function _resetForTest() {
    _paused = false;
    _lastActivityTs = nowFn();
  }

  return { start, stop, markActivity, getState, _resetForTest };
}

module.exports = { createIdleTracker };
