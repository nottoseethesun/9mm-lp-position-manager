/**
 * @file test/il-excludes-compounded.test.js
 * @description Guards that the IL/G figures carry no fee earnings.
 *
 *   Compounding calls `increaseLiquidity`, so compounded fees become
 *   part of the liquidity `positionValueUsd` measures, while the HODL
 *   side stays fixed at the deposited amounts. Left in, a $100 compound
 *   reads as $100 of LP outperformance — and Profit adds the same $100
 *   again as fee earnings.
 */

"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { _computeIL } = require("../src/bot-pnl-updater");

/** Run _computeIL over a position worth `lpValue`, 100+100 deposited. */
function run({ lpValue, compounded = 0, perNft = 0 }) {
  const snap = { residualValueUsd: 0, totalCompoundedUsd: compounded };
  const deps = {
    _botState: {
      hodlBaseline: { hodlAmount0: 100, hodlAmount1: 100 },
      lifetimeHodlAmounts: { amount0: 100, amount1: 100 },
      nftCompoundedUsdByTokenId: { 7: perNft },
    },
  };
  _computeIL(snap, deps, lpValue, 1, 1, "7");
  return snap;
}

describe("IL/G excludes compounded fees", () => {
  it("removes lifetime compounded fees from the lifetime figure", () => {
    /*- 200 deposited, position worth 260 of which 60 is compounded
     *  fees. Divergence is nil, so IL must be nil. */
    assert.equal(run({ lpValue: 260, compounded: 60 }).lifetimeIL, 0);
  });

  it("removes only this NFT's compounds from the current figure", () => {
    /*- The current-NFT comparison starts at its own mint, which already
     *  contained the earlier compounds. */
    const snap = run({ lpValue: 260, compounded: 60, perNft: 25 });
    assert.equal(snap.totalIL, 235 - 200);
  });

  it("reports the same IL however much was compounded", () => {
    /*- Two positions with identical divergence must not differ in IL
     *  just because one reinvested more fees. */
    const a = run({ lpValue: 200, compounded: 0 });
    const b = run({ lpValue: 260, compounded: 60 });
    assert.equal(a.lifetimeIL, b.lifetimeIL);
  });

  it("still reports real divergence", () => {
    assert.equal(run({ lpValue: 150 }).lifetimeIL, -50);
  });

  it("publishes what it removed, for the IL/G popover", () => {
    const snap = run({ lpValue: 260, compounded: 60, perNft: 25 });
    assert.equal(snap.ilInputs.lt.compoundedRemoved, 60);
    assert.equal(snap.ilInputs.cur.compoundedRemoved, 25);
    /*- lpValue stays the raw on-chain figure; the popover subtracts. */
    assert.equal(snap.ilInputs.lpValue, 260);
  });

  it("treats a missing per-NFT entry as nothing compounded", () => {
    const snap = run({ lpValue: 260, compounded: 60 });
    assert.equal(snap.ilInputs.cur.compoundedRemoved, 0);
  });
});
