/**
 * @file test/bot-deposit.test.js
 * @description Tests for `totalLifetimeDeposit`'s belt-and-suspenders guard:
 *   a deposit whose token amounts compute non-finite (undefined/NaN decimals
 *   → `10 ** undefined === NaN`) is skipped rather than poisoning the running
 *   total. With valid decimals the total is computed normally.
 * Run with: npm test
 */

"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { totalLifetimeDeposit } = require("../src/bot-deposit");

/*- One deposit: 1.0 token0 and 2.0 token1 (18 decimals each), fresh per call
 *  because `totalLifetimeDeposit` memoizes computed USD onto each entry. */
function oneDeposit() {
  return [
    { raw0: "1000000000000000000", raw1: "2000000000000000000", block: 100 },
  ];
}
const prices = async () => ({ price0: 2, price1: 3 });

describe("totalLifetimeDeposit NaN guard", () => {
  it("skips a deposit with undefined decimals instead of NaN-poisoning the total", async () => {
    const res = await totalLifetimeDeposit(
      oneDeposit(),
      undefined,
      undefined,
      prices,
    );
    assert.equal(Number.isFinite(res.total), true);
    assert.equal(res.total, 0);
  });

  it("computes a finite total with valid decimals", async () => {
    // 1.0 token0 @ $2 + 2.0 token1 @ $3 = 8
    const res = await totalLifetimeDeposit(oneDeposit(), 18, 18, prices);
    assert.equal(res.total, 8);
  });
});
