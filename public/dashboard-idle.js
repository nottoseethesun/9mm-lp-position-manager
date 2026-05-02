/**
 * @file dashboard-idle.js
 * @description Browser-side idle detection for the idle-driven price-
 *   lookup pause (component 4 of 4 — see docs/architecture.md
 *   "Idle-Driven Price-Lookup Pause").
 *
 * Two independent timers, each capable of pausing on its own:
 *   - 2-min window of `blur` with no `focus` → POST /api/pause-price-lookups
 *   - 15-min window of no input/activity → POST /api/pause-price-lookups
 *
 * Both timers reset on any of the activity events listed below.  When
 * the browser believes itself paused, the next throttled activity event
 * also POSTs /api/unpause-price-lookups.
 *
 * The 3-second `/api/status` polling loop in dashboard-data.js is
 * intentionally orthogonal — it keeps polling whether paused or not,
 * and the server happily serves it from cached / last-known prices
 * without unpausing.
 */

import { csrfHeaders } from "./dashboard-helpers.js";

const PAUSE_AFTER_BLUR_MS = 2 * 60_000;
const PAUSE_AFTER_NO_INPUT_MS = 15 * 60_000;
const ACTIVITY_THROTTLE_MS = 500;

let _blurTimer = null;
let _noInputTimer = null;
let _browserHasPaused = false;
let _lastActivityTs = 0;
let _lastActivityType = "activity";

/**
 * Activity event set.  Covers every gesture surface that real human use
 * produces — mouse, keyboard, scroll, touch, pointer.  `focus` is
 * critical: it must unpause BEFORE any subsequent click can route to a
 * server-tier view endpoint that needs fresh prices.
 */
const ACTIVITY_EVENTS = [
  "focus",
  "click",
  "mousedown",
  "mousemove",
  "wheel",
  "keydown",
  "touchstart",
  "touchend",
  "pointerdown",
];

function _post(url, reason) {
  try {
    fetch(url, {
      method: "POST",
      headers: { ...csrfHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  } catch {
    /* best-effort */
  }
}

function _sendPause(reason) {
  if (_browserHasPaused) return;
  _post("/api/pause-price-lookups", reason);
  _browserHasPaused = true;
  console.log("[dashboard] paused price lookups:", reason);
}

function _sendUnpause(reason) {
  _post("/api/unpause-price-lookups", reason);
  _browserHasPaused = false;
  console.log("[dashboard] unpaused price lookups:", reason);
}

/**
 * Throttled activity handler.  Resets the no-input timer; if the
 * browser was paused, posts the unpause endpoint exactly once.  The
 * triggering event's `type` is captured in `_lastActivityType` so the
 * subsequent unpause POST can record which gesture broke the idle
 * (`focus`, `click`, `keydown`, `touchstart`, …).
 *
 * @param {Event} ev  DOM event from any of `ACTIVITY_EVENTS`.
 */
function _onActivity(ev) {
  if (ev && ev.type) _lastActivityType = ev.type;
  const now = Date.now();
  if (now - _lastActivityTs < ACTIVITY_THROTTLE_MS) return;
  _lastActivityTs = now;
  if (_noInputTimer) clearTimeout(_noInputTimer);
  _noInputTimer = setTimeout(
    () => _sendPause("no-input 15m"),
    PAUSE_AFTER_NO_INPUT_MS,
  );
  if (_browserHasPaused) _sendUnpause(_lastActivityType);
}

function _onBlur() {
  if (_blurTimer) clearTimeout(_blurTimer);
  _blurTimer = setTimeout(() => _sendPause("blur 2m"), PAUSE_AFTER_BLUR_MS);
}

function _onFocus() {
  if (_blurTimer) clearTimeout(_blurTimer);
  _blurTimer = null;
}

/**
 * Bootstrap browser-side idle detection.  Idempotent — safe to call
 * once at dashboard init (additional calls are no-ops).
 */
let _started = false;
export function startBrowserIdleTracker() {
  if (_started) return;
  _started = true;
  for (const name of ACTIVITY_EVENTS) {
    window.addEventListener(name, _onActivity, { passive: true });
  }
  window.addEventListener("blur", _onBlur);
  window.addEventListener("focus", _onFocus);
  /*- Arm the no-input timer immediately so a tab opened-then-ignored
   *  eventually pauses without requiring a single gesture first. */
  _noInputTimer = setTimeout(
    () => _sendPause("no-input 15m"),
    PAUSE_AFTER_NO_INPUT_MS,
  );
  console.log("[dashboard] idle tracker started");
}

/** Test/debug: current browser-side pause flag. */
export function _isBrowserPaused() {
  return _browserHasPaused;
}
