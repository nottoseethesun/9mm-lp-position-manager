/**
 * @file test/pnl-daily.test.js
 * @description Tests for daily P&L cumulative calculation with residuals.
 * Split from pnl-tracker.test.js.
 */

"use strict";

const { describe, it } = require("node:test");
const assert = require("assert");
const { createPnlTracker } = require("../src/pnl-tracker");

describe("dailyPnl cumulative excludes residuals", () => {
  it("cumulative equals running sum of netPnl without residuals", () => {
    const tracker = createPnlTracker();
    tracker.openEpoch({
      entryValue: 100,
      entryPrice: 1,
      lowerPrice: 0.8,
      upperPrice: 1.2,
      openTime: "2025-06-01T12:00:00Z",
    });
    tracker.closeEpoch({
      exitValue: 110,
      gasCost: 0.5,
      token0UsdPrice: 1.1,
      token1UsdPrice: 1,
      closeTime: "2025-06-01T12:00:00Z",
    });
    tracker.openEpoch({
      entryValue: 120,
      entryPrice: 1.1,
      lowerPrice: 0.9,
      upperPrice: 1.3,
      openTime: "2025-06-02T12:00:00Z",
    });
    tracker.updateLiveEpoch({ currentPrice: 1.15, feesAccrued: 2 });
    const daily = tracker.snapshot(1.15, "2025-06-01").dailyPnl;
    assert.ok(daily.length >= 2, "should have at least 2 days");
    // Residual column still populated for display
    const rebDay = daily.find((d) => d.residual !== 0);
    assert.ok(rebDay, "should have a day with residual");
    // Cumulative should equal running sum of netPnl (no residuals)
    const cumNetOnly = daily.reduce((s, d) => s + d.netPnl, 0);
    const lastCum = daily[0].cumulative;
    assert.ok(
      Math.abs(lastCum - cumNetOnly) < 0.01,
      `cumulative ${lastCum} should equal sum of netPnl ${cumNetOnly}`,
    );
  });

  it("a gap between epochs shows as value moving IN", () => {
    const tracker = createPnlTracker();
    tracker.openEpoch({
      entryValue: 500,
      entryPrice: 1,
      lowerPrice: 0.8,
      upperPrice: 1.2,
      openTime: "2025-07-01T00:00:00Z",
    });
    tracker.closeEpoch({
      exitValue: 480,
      gasCost: 1,
      token0UsdPrice: 0.95,
      token1UsdPrice: 1,
      closeTime: "2025-07-02T00:00:00Z",
    });
    /*- The next position opens at 520 having closed the last at 480, so
     *  40 went INTO the position — from the wallet, or a top-up.  In/Out
     *  is `exit − entry`, so that reads as −40: negative is IN, matching
     *  the Lifetime panel's Wallet Residual direction. */
    tracker.openEpoch({
      entryValue: 520,
      entryPrice: 1.05,
      lowerPrice: 0.85,
      upperPrice: 1.25,
      openTime: "2025-07-03T00:00:00Z",
    });
    tracker.updateLiveEpoch({ currentPrice: 1.02, feesAccrued: 5 });
    const daily = tracker.snapshot(1.02).dailyPnl;
    const totalInOut = daily.reduce((s, d) => s + (d.inOut || 0), 0);
    assert.ok(
      totalInOut < 0,
      `value went in, so In/Out must be negative; got ${totalInOut}`,
    );
    assert.ok(
      Math.abs(totalInOut + 40) < 0.01,
      `expected -40, got ${totalInOut}`,
    );
  });
});
