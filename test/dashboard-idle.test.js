"use strict";

/**
 * @file test/dashboard-idle.test.js
 * @description Tests for the no-input timer's self-staleness guard in
 *   `public/dashboard-idle.js`.  The dashboard module is an ES module
 *   bundled by esbuild for the browser; we replicate the timer-arm
 *   helper in CommonJS for direct test access.  Mirror is small enough
 *   to keep in lockstep by inspection — if you change one, change the
 *   other.  Same pattern as `test/dashboard-csrf-fetch.test.js`.
 *
 *   Bug under test: after a long throttled-tab interval, Chrome can
 *   move a long-deferred setTimeout callback from the timer-heap into
 *   the task queue.  `clearTimeout` afterwards is a no-op for an
 *   already-queued task.  A fresh _onActivity reset arms a new timer
 *   correctly, but moments later the stale callback flushes and pauses
 *   everything — exactly matching the user-observed sequence
 *   `unpaused (mousemove)` followed ~10 s later by
 *   `paused (no-input 15m)`.
 *
 *   Fix: each timer arming captures `armedAt` in its own closure.  The
 *   callback self-cancels when `Date.now() - armedAt > 15 m + 2 s`.
 */

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// ── In-test replica of `_armNoInputTimer` ──────────────────────────────────

const PAUSE_AFTER_NO_INPUT_MS = 15 * 60_000;
const STALE_MARGIN_MS = 2_000;

let _noInputTimer = null;
let _now = 0;
let _pending = [];
let _sendPauseCalls = [];

function _setTimeout(fn /*, _ms */) {
  const handle = { fn, cleared: false };
  _pending.push(handle);
  return handle;
}
function _clearTimeout(h) {
  if (h) h.cleared = true;
}
function _dateNow() {
  return _now;
}
function _sendPause(reason) {
  _sendPauseCalls.push(reason);
}

function _armNoInputTimer() {
  if (_noInputTimer) _clearTimeout(_noInputTimer);
  _noInputTimer = null;
  const armedAt = _dateNow();
  _noInputTimer = _setTimeout(() => {
    _noInputTimer = null;
    if (_dateNow() - armedAt > PAUSE_AFTER_NO_INPUT_MS + STALE_MARGIN_MS)
      return;
    _sendPause("no-input 15m");
  }, PAUSE_AFTER_NO_INPUT_MS);
}

function _firePending() {
  const generation = _pending;
  _pending = [];
  for (const h of generation) if (!h.cleared) h.fn();
}

beforeEach(() => {
  _noInputTimer = null;
  _now = 0;
  _pending = [];
  _sendPauseCalls = [];
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("no-input timer self-staleness guard", () => {
  it("normal firing at +15m calls _sendPause", () => {
    _now = 1000;
    _armNoInputTimer();
    _now += PAUSE_AFTER_NO_INPUT_MS;
    _firePending();
    assert.deepStrictEqual(_sendPauseCalls, ["no-input 15m"]);
  });

  it("firing at +15m + 1s still pauses (within 2s margin)", () => {
    _now = 1000;
    _armNoInputTimer();
    _now += PAUSE_AFTER_NO_INPUT_MS + 1_000;
    _firePending();
    assert.deepStrictEqual(_sendPauseCalls, ["no-input 15m"]);
  });

  it("firing at +15m + 2s + 1ms self-cancels (just past margin)", () => {
    _now = 1000;
    _armNoInputTimer();
    _now += PAUSE_AFTER_NO_INPUT_MS + STALE_MARGIN_MS + 1;
    _firePending();
    assert.deepStrictEqual(_sendPauseCalls, []);
  });

  it("stale firing hours after arming self-cancels", () => {
    _now = 1000;
    _armNoInputTimer();
    _now += 3 * 60 * 60_000; // 3 hours
    _firePending();
    assert.deepStrictEqual(_sendPauseCalls, []);
  });

  it(
    "stale callback survives clearTimeout but bails despite a fresh re-arm " +
      "(exactly the user-observed `unpaused → paused 10s later` race)",
    () => {
      _now = 1000;
      _armNoInputTimer();
      const staleHandle = _pending[0];

      // Hours pass — tab was throttled, the original callback is now
      // long overdue.  Chrome unthrottles and "queues" the callback
      // (we simulate this by keeping `staleHandle` alive even though
      // the next _armNoInputTimer call will clear it via the handle's
      // `cleared` flag — Chrome's task-queue position has already been
      // committed and `clearTimeout` is too late).
      _now += 3 * 60 * 60_000;

      // _onActivity-equivalent: arms a fresh timer (and clears the
      // stale handle, but per the bug premise that clear is too late).
      _armNoInputTimer();

      // Force-fire the stale callback as if Chrome had already moved
      // it onto the task queue before clearTimeout ran.
      staleHandle.fn();

      // The fix proves itself: closure-captured `armedAt` (from the
      // ORIGINAL arming, hours ago) makes the staleness check fire
      // even though a fresh _armNoInputTimer has set a new module-
      // level `_noInputTimer`.  Without closure capture, a stale
      // callback would see "fresh armedAt" and proceed.
      assert.deepStrictEqual(
        _sendPauseCalls,
        [],
        "stale callback must self-cancel even though a fresh re-arm has happened",
      );
    },
  );

  it("re-arm clears the prior pending handle", () => {
    _now = 1000;
    _armNoInputTimer();
    const firstHandle = _pending[0];
    _now += 5_000;
    _armNoInputTimer();
    assert.strictEqual(
      firstHandle.cleared,
      true,
      "_armNoInputTimer must clear the prior pending handle",
    );
  });

  it("only the most recent arming pauses on its own clean fire", () => {
    _now = 1000;
    _armNoInputTimer();
    _now += 5_000;
    _armNoInputTimer();
    _now += PAUSE_AFTER_NO_INPUT_MS; // 15m past second arm
    _firePending();
    assert.deepStrictEqual(_sendPauseCalls, ["no-input 15m"]);
  });
});
