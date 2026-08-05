/**
 * @file test/handle-api-status-defaults.test.js
 * @description
 * Guards the shipped-default publication contract of `GET /api/status`.
 *
 * The dashboard is not allowed to hold its own copy of a shipped
 * default (feedback-one-literal-per-shipped-default). The only way it
 * can honour that is if the server actually publishes the value — so
 * the publication itself needs a test, or a client falls back to a
 * degraded path with nothing failing.
 *
 * That is exactly what happened with `rescanPricesDefaultDays`: the
 * Re-scan Prices dialog rendered "Window unavailable — will re-value
 * the entire history" because the value was absent from the response.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { createApiStatusHandler } = require("../src/handle-api-status");
const config = require("../src/config");

/** Drive the real handler with the smallest viable dependency set. */
async function statusPayload(overrides = {}) {
  let captured = null;
  const handler = createApiStatusHandler({
    config,
    diskConfig: { global: {}, positions: {} },
    /*- The full contract the handler exercises — enumerated from the
     *  source, not guessed: getAll, getPoolDailyCounts, runningCount. */
    positionMgr: {
      runningCount: () => 0,
      getAll: () => [],
      getPoolDailyCounts: () => ({}),
    },
    walletManager: { getAddress: () => "0xW" },
    routeHandlers: { getPositionScanStatus: () => null },
    buildStatusPositions: () => ({}),
    buildGasStatusPayload: async () => ({}),
    actualGasCostUsd: async () => 0,
    getLpProviderDisplayName: () => "9mm v3",
    managedKeys: () => [],
    jsonResponse: (_res, _code, body) => {
      captured = body;
    },
    ...overrides,
  });
  await handler({}, {});
  return captured;
}

test("/api/status publishes rescanPricesDefaultDays in `global`", async () => {
  const body = await statusPayload();
  assert.ok(body, "handler must respond");
  assert.equal(
    body.global.rescanPricesDefaultDays,
    config.RESCAN_PRICES_DEFAULT_DAYS,
    "the dialog reads this; without it the window option degrades",
  );
});

test("the published window default is a positive number", async () => {
  const body = await statusPayload();
  const n = body.global.rescanPricesDefaultDays;
  assert.equal(typeof n, "number");
  assert.ok(n > 0, "a non-positive window would mean 'whole history'");
});

test("config sources the window default from the shipped JSON", () => {
  /*- The single literal must live in the shipped defaults file, not in
   *  config.js and not in the dashboard. */
  const shipped = require("../app-config/app-defaults-for-user-configurable/bot-config-defaults.json");
  assert.equal(
    config.RESCAN_PRICES_DEFAULT_DAYS,
    shipped.rescanPricesDefaultDays,
  );
});

test("the sibling posDefaults still reach `global` (merge intact)", async () => {
  /*- rescanPricesDefaultDays rides the same `...posDefaults` spread; if
   *  that spread ever moves, this catches it alongside. */
  const body = await statusPayload();
  assert.equal(body.global.maxRebalancesPerDay, config.MAX_REBALANCES_PER_DAY);
});
