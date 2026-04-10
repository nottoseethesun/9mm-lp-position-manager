/**
 * @file test/gecko-rate-limit.test.js
 * @description Tests for the shared GeckoTerminal sliding-window rate limiter.
 */

"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  geckoRateLimit,
  _resetForTest,
  _MAX_CALLS,
} = require("../src/gecko-rate-limit");

describe("gecko-rate-limit", () => {
  let _origSetTimeout;

  beforeEach(() => {
    _resetForTest();
    _origSetTimeout = global.setTimeout;
  });

  afterEach(() => {
    global.setTimeout = _origSetTimeout;
    _resetForTest();
  });

  it("allows calls up to _MAX_CALLS without waiting", async () => {
    global.setTimeout = () => {
      throw new Error("should not sleep under the limit");
    };
    for (let i = 0; i < _MAX_CALLS; i++) {
      await geckoRateLimit();
    }
  });

  it("waits before the (_MAX_CALLS + 1)th call", async () => {
    let slept = false;
    global.setTimeout = (fn, ms) => {
      if (ms > 0) slept = true;
      return _origSetTimeout(fn, 0); // fast-forward during test
    };
    for (let i = 0; i < _MAX_CALLS; i++) await geckoRateLimit();
    assert.equal(slept, false, "no sleep up to the limit");
    await geckoRateLimit();
    assert.equal(slept, true, "should have slept on the overflow call");
  });

  it("resets cleanly for tests", async () => {
    // Fill the window, then reset and verify budget is restored.
    global.setTimeout = (fn) => _origSetTimeout(fn, 0);
    for (let i = 0; i < _MAX_CALLS; i++) await geckoRateLimit();
    _resetForTest();
    let slept = false;
    global.setTimeout = (fn, ms) => {
      if (ms > 0) slept = true;
      return _origSetTimeout(fn, 0);
    };
    for (let i = 0; i < _MAX_CALLS; i++) await geckoRateLimit();
    assert.equal(slept, false, "after reset, budget should be fresh");
  });
});
