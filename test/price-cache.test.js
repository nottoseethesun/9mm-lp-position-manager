/**
 * @file test/price-cache.test.js
 * @description Tests for the historical price disk cache module.
 */

"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  getHistoricalPrice,
  setHistoricalPrice,
  flushPriceCache,
  toUtcDayKey,
  _resetForTest,
  _CACHE_PATH,
} = require("../src/price-cache");

const _TMP = path.join(process.cwd(), "tmp", "test-price-cache-" + process.pid);

describe("price-cache", () => {
  beforeEach(() => {
    _resetForTest();
    try {
      fs.unlinkSync(_CACHE_PATH);
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    _resetForTest();
    try {
      fs.unlinkSync(_CACHE_PATH);
    } catch {
      /* ignore */
    }
  });

  it("returns null on cache miss", () => {
    const price = getHistoricalPrice(
      "pulsechain",
      "0xabc123",
      "2026-03-15T00:00",
    );
    assert.equal(price, null);
  });

  it("set + get round-trips correctly", () => {
    setHistoricalPrice("pulsechain", "0xABC123", "2026-03-15T00:00", 0.001302);
    const price = getHistoricalPrice(
      "pulsechain",
      "0xabc123",
      "2026-03-15T00:00",
    );
    assert.equal(price, 0.001302);
  });

  it("key is case-insensitive on token address", () => {
    setHistoricalPrice("pulsechain", "0xAbCdEf", "2026-03-15T00:00", 42.5);
    assert.equal(
      getHistoricalPrice("pulsechain", "0xABCDEF", "2026-03-15T00:00"),
      42.5,
    );
    assert.equal(
      getHistoricalPrice("pulsechain", "0xabcdef", "2026-03-15T00:00"),
      42.5,
    );
  });

  it("date-only lookup falls back to T00:00", () => {
    setHistoricalPrice("pulsechain", "0xabc", "2026-03-15T00:00", 1.5);
    const price = getHistoricalPrice("pulsechain", "0xabc", "2026-03-15");
    assert.equal(price, 1.5);
  });

  it("date-only lookup returns null when no T00:00 entry", () => {
    setHistoricalPrice("pulsechain", "0xabc", "2026-03-15T14:30", 1.5);
    const price = getHistoricalPrice("pulsechain", "0xabc", "2026-03-15");
    assert.equal(price, null);
  });

  it("flush writes to disk and survives reload", () => {
    setHistoricalPrice("pulsechain", "0xtoken1", "2026-04-01T00:00", 0.05);
    flushPriceCache();
    assert.ok(fs.existsSync(_CACHE_PATH));
    // Reset in-memory and reload from disk
    _resetForTest();
    const price = getHistoricalPrice(
      "pulsechain",
      "0xtoken1",
      "2026-04-01T00:00",
    );
    assert.equal(price, 0.05);
  });

  it("flush is a no-op when not dirty", () => {
    flushPriceCache();
    assert.ok(!fs.existsSync(_CACHE_PATH));
  });

  it("toUtcDayKey normalizes timestamps to UTC day T00:00", () => {
    // 2026-03-15 14:30:00 UTC
    const ts = Math.floor(new Date("2026-03-15T14:30:00Z").getTime() / 1000);
    assert.equal(toUtcDayKey(ts), "2026-03-15T00:00");
  });

  it("toUtcDayKey handles midnight exactly", () => {
    const ts = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
    assert.equal(toUtcDayKey(ts), "2026-01-01T00:00");
  });

  it("different blockchains are separate cache entries", () => {
    setHistoricalPrice("pulsechain", "0xabc", "2026-03-15T00:00", 1.0);
    setHistoricalPrice("ethereum", "0xabc", "2026-03-15T00:00", 2.0);
    assert.equal(
      getHistoricalPrice("pulsechain", "0xabc", "2026-03-15T00:00"),
      1.0,
    );
    assert.equal(
      getHistoricalPrice("ethereum", "0xabc", "2026-03-15T00:00"),
      2.0,
    );
  });

  it("minute-level keys are preserved", () => {
    setHistoricalPrice("pulsechain", "0xabc", "2026-03-15T14:30", 3.0);
    setHistoricalPrice("pulsechain", "0xabc", "2026-03-15T14:31", 3.01);
    assert.equal(
      getHistoricalPrice("pulsechain", "0xabc", "2026-03-15T14:30"),
      3.0,
    );
    assert.equal(
      getHistoricalPrice("pulsechain", "0xabc", "2026-03-15T14:31"),
      3.01,
    );
  });
});
