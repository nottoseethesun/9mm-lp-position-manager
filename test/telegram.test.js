/**
 * @file test/telegram.test.js
 * @description Unit tests for the Telegram notification module.
 */

"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

let _originalFetch;
beforeEach(() => {
  _originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = _originalFetch;
});

const {
  setBotToken,
  setChatId,
  isConfigured,
  setEnabledEvents,
  getEnabledEvents,
  notify,
  testConnection,
  buildHeader,
  EVENT_DEFAULTS,
} = require("../src/telegram-notifications/telegram");

describe("telegram — configuration", () => {
  beforeEach(() => {
    setBotToken(null);
    setChatId(null);
    setEnabledEvents(EVENT_DEFAULTS);
  });

  it("isConfigured returns false when token or chatId is missing", () => {
    assert.strictEqual(isConfigured(), false);
    setBotToken("tok");
    assert.strictEqual(isConfigured(), false);
    setChatId("123");
    assert.strictEqual(isConfigured(), true);
  });

  it("setEnabledEvents overrides defaults", () => {
    setEnabledEvents({ oorTimeout: false, rebalanceSuccess: true });
    const ev = getEnabledEvents();
    assert.strictEqual(ev.oorTimeout, false);
    assert.strictEqual(ev.rebalanceSuccess, true);
    assert.strictEqual(ev.rebalanceFail, true, "untouched default");
  });

  it("setEnabledEvents ignores unknown keys", () => {
    setEnabledEvents({ bogus: true });
    const ev = getEnabledEvents();
    assert.strictEqual(ev.bogus, undefined);
  });
});

describe("telegram — buildHeader", () => {
  it("builds full header from a populated position", () => {
    const lines = buildHeader("Test Title", {
      tokenId: 42,
      fee: 2500,
      token0Symbol: "WPLS",
      token1Symbol: "eHEX",
    });
    /*- First line is always the title with hostname prefix.  Each
     *  subsequent line is data-conditional; we just assert the data
     *  lines are present in the right relative order. */
    assert.ok(lines[0].includes("Test Title"));
    const body = lines.join("\n");
    assert.ok(body.includes("WPLS /"));
    assert.ok(body.includes("    eHEX"));
    assert.ok(body.includes("Fee Tier: 0.25%"));
    assert.ok(body.includes("Position: #42"));
  });

  it("omits position-block lines when fields are missing", () => {
    const lines = buildHeader("Solo Title", { tokenId: 7 });
    assert.ok(lines[0].includes("Solo Title"));
    /*- No fee → no Fee Tier line; no symbols → no pair lines. */
    const body = lines.join("\n");
    assert.ok(!body.includes("Fee Tier"));
    assert.ok(!body.includes(" /"));
    assert.ok(body.includes("Position: #7"));
  });

  it("returns just the title line when position is falsy", () => {
    const lines = buildHeader("Global Alert", null);
    assert.strictEqual(lines.length, 1);
    assert.ok(lines[0].includes("Global Alert"));
  });

  it("truncates long token symbols in the header pair", () => {
    const lines = buildHeader("X", {
      tokenId: 1,
      token0Symbol: "AAAAAAAAAAAAAAAAA",
      token1Symbol: "BBBBBBBBBBBBBBBBB",
    });
    const body = lines.join("\n");
    /*- 12-char compact-header truncation budget. */
    assert.ok(body.includes("AAAAAAAAAAAA /"));
    assert.ok(body.includes("    BBBBBBBBBBBB"));
  });
});

describe("telegram — notify", () => {
  beforeEach(() => {
    setBotToken("tok");
    setChatId("123");
    setEnabledEvents(EVENT_DEFAULTS);
  });
  afterEach(() => {
    setBotToken(null);
    setChatId(null);
  });

  it("skips when not configured", async () => {
    setBotToken(null);
    const sent = await notify("rebalanceFail", { error: "boom" });
    assert.strictEqual(sent, false);
  });

  it("skips disabled event types", async () => {
    const sent = await notify("rebalanceSuccess", { message: "ok" });
    assert.strictEqual(sent, false, "rebalanceSuccess is off by default");
  });

  it("sends for enabled event types", async () => {
    let captured = null;
    globalThis.fetch = async (url, opts) => {
      captured = { url, body: JSON.parse(opts.body) };
      return { ok: true, json: async () => ({}) };
    };
    const sent = await notify("rebalanceFail", {
      position: { tokenId: 99, token0Symbol: "A", token1Symbol: "B" },
      error: "revert",
    });
    assert.strictEqual(sent, true);
    assert.ok(captured.url.includes("/sendMessage"));
    assert.ok(captured.body.text.includes("Rebalance Failed"));
    assert.ok(captured.body.text.includes("Position: #99"));
    assert.ok(captured.body.text.includes("A /"));
    assert.ok(captured.body.text.includes("    B"));
    assert.ok(captured.body.text.includes("revert"));
  });

  it("returns false on HTTP failure", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 400,
      text: async () => "bad request",
    });
    const sent = await notify("otherError", { error: "x" });
    assert.strictEqual(sent, false);
  });
});

describe("telegram — testConnection", () => {
  afterEach(() => {
    setBotToken(null);
    setChatId(null);
  });

  it("returns error when not configured", async () => {
    const r = await testConnection();
    assert.strictEqual(r.ok, false);
    assert.ok(r.error.includes("not configured"));
  });

  it("returns ok on successful send", async () => {
    setBotToken("tok");
    setChatId("123");
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({}),
    });
    const r = await testConnection();
    assert.strictEqual(r.ok, true);
  });
});
