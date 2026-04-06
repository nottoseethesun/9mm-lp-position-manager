/**
 * @file test/rebalancer-pools-impact.test.js
 * @description Tests for _checkSwapImpact guard.
 */

"use strict";

const { describe, it } = require("node:test");
const assert = require("assert");
const { _checkSwapImpact, _deadline } = require("../src/rebalancer-pools");

describe("_checkSwapImpact", () => {
  it("does not throw when impact is within slippage", () => {
    assert.doesNotThrow(() => _checkSwapImpact(0.3, 0.5));
  });

  it("throws when impact exceeds slippage", () => {
    assert.throws(
      () => _checkSwapImpact(1.2, 0.5),
      /Swap aborted.*exceeds slippage/,
    );
  });

  it("throws on non-finite impact", () => {
    assert.throws(() => _checkSwapImpact(NaN, 0.5), /price impact is NaN/);
    assert.throws(
      () => _checkSwapImpact(Infinity, 0.5),
      /price impact is Infinity/,
    );
  });

  it("suggests a higher slippage in the error message", () => {
    try {
      _checkSwapImpact(2.3, 0.5);
      assert.fail("should have thrown");
    } catch (e) {
      assert.match(e.message, /Increase to at least/);
      assert.match(e.message, /2\.8%/);
    }
  });
});

describe("_deadline", () => {
  it("returns a bigint in the future", () => {
    const dl = _deadline();
    const now = BigInt(Math.floor(Date.now() / 1000));
    assert.ok(typeof dl === "bigint");
    assert.ok(dl > now, "deadline should be in the future");
    assert.ok(dl - now <= 600n, "default offset should be ≤ 600s");
  });

  it("accepts a custom offset", () => {
    const dl = _deadline(60);
    const now = BigInt(Math.floor(Date.now() / 1000));
    assert.ok(dl - now >= 59n && dl - now <= 61n);
  });
});
