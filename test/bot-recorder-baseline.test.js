/**
 * @file test/bot-recorder-baseline.test.js
 * @description Tests for _updateHodlBaseline mintGasWei handling.
 */

"use strict";

const { describe, it } = require("node:test");
const assert = require("assert");

describe("_updateHodlBaseline mintGasWei", () => {
  it("preserves mintGasWei from rebalance result", () => {
    const { _updateHodlBaseline } = require("../src/bot-recorder");
    const botState = {};
    _updateHodlBaseline(
      botState,
      {
        amount0Minted: 1000n,
        amount1Minted: 2000n,
        decimals0: 8,
        decimals1: 8,
        token0UsdPrice: 1,
        token1UsdPrice: 1,
        mintGasCostWei: 500000000000000n,
      },
      "2026-04-05T12:00:00Z",
    );
    assert.equal(botState.hodlBaseline.mintGasWei, "500000000000000");
  });

  it("sets mintGasWei to 0 when missing from result", () => {
    const { _updateHodlBaseline } = require("../src/bot-recorder");
    const botState = {};
    _updateHodlBaseline(
      botState,
      {
        amount0Minted: 1000n,
        amount1Minted: 2000n,
        decimals0: 8,
        decimals1: 8,
        token0UsdPrice: 1,
        token1UsdPrice: 1,
      },
      "2026-04-05T12:00:00Z",
    );
    assert.equal(botState.hodlBaseline.mintGasWei, "0");
  });
});
