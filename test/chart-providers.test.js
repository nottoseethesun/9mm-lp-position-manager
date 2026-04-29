/**
 * @file test/chart-providers.test.js
 * @description Unit tests for src/chart-providers.js and the
 * GET /api/chart-providers route handler. Covers the happy path (real
 * chains.json on disk), per-chain blockchain-slug substitution
 * (DexTools' "pulse" vs DexScreener's "pulsechain"), URL-template
 * shape, malformed-entry filtering, and the always-200 route contract.
 */

"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const _FILE = path.join(
  __dirname,
  "..",
  "app-config",
  "static-tunables",
  "chains.json",
);

let _originalContent = null;

function _clearModuleCache() {
  delete require.cache[require.resolve("../src/chart-providers")];
  delete require.cache[require.resolve("../src/runtime-flags")];
  delete require.cache[_FILE];
}

beforeEach(() => {
  if (fs.existsSync(_FILE)) _originalContent = fs.readFileSync(_FILE, "utf8");
  _clearModuleCache();
});

afterEach(() => {
  if (_originalContent !== null) fs.writeFileSync(_FILE, _originalContent);
  _originalContent = null;
  _clearModuleCache();
});

describe("chart-providers.readChartProviders — happy path", () => {
  it("returns DexScreener / GeckoTerminal / DexTools entries for pulsechain", () => {
    const { readChartProviders } = require("../src/chart-providers");
    const out = readChartProviders("pulsechain");
    const keys = out.map((p) => p.key);
    assert.deepEqual(keys, ["dexscreener", "geckoterminal", "dextools"]);
  });

  it("substitutes the pulsechain slug into DexScreener's URL", () => {
    const { readChartProviders } = require("../src/chart-providers");
    const ds = readChartProviders("pulsechain").find(
      (p) => p.key === "dexscreener",
    );
    assert.equal(ds.urlTemplate, "https://dexscreener.com/pulsechain/{poolId}");
  });

  it("substitutes the pulsechain slug into GeckoTerminal's URL", () => {
    const { readChartProviders } = require("../src/chart-providers");
    const gt = readChartProviders("pulsechain").find(
      (p) => p.key === "geckoterminal",
    );
    assert.equal(
      gt.urlTemplate,
      "https://www.geckoterminal.com/pulsechain/pools/{poolId}",
    );
  });

  it("uses DexTools' 'pulse' slug, not 'pulsechain'", () => {
    const { readChartProviders } = require("../src/chart-providers");
    const dt = readChartProviders("pulsechain").find(
      (p) => p.key === "dextools",
    );
    assert.equal(
      dt.urlTemplate,
      "https://www.dextools.io/app/pulse/pair-explorer/{poolId}",
    );
  });

  it("preserves the {poolId} placeholder for the client to fill in", () => {
    const { readChartProviders } = require("../src/chart-providers");
    for (const p of readChartProviders("pulsechain")) {
      assert.ok(
        p.urlTemplate.includes("{poolId}"),
        `template for ${p.key} should still contain {poolId}`,
      );
    }
  });

  it("returns the human-readable name for each provider", () => {
    const { readChartProviders } = require("../src/chart-providers");
    const names = Object.fromEntries(
      readChartProviders("pulsechain").map((p) => [p.key, p.name]),
    );
    assert.deepEqual(names, {
      dexscreener: "DexScreener",
      geckoterminal: "GeckoTerminal",
      dextools: "DexTools",
    });
  });

  it("falls back to pulsechain when chain name is unknown", () => {
    const { readChartProviders } = require("../src/chart-providers");
    const out = readChartProviders("not-a-real-chain");
    assert.equal(out.length, 3);
  });
});

describe("chart-providers.readChartProviders — malformed entries", () => {
  function _writeWithChartProviders(providers) {
    fs.writeFileSync(
      _FILE,
      JSON.stringify({
        pulsechain: { chartProviders: providers },
      }),
    );
  }

  it("drops entries missing the name", () => {
    _writeWithChartProviders({
      ok: {
        name: "OK",
        scheme: "https",
        domain: "ok.example",
        blockchain: "x",
        pathSegments: ["{poolId}"],
      },
      noName: {
        scheme: "https",
        domain: "noname.example",
        blockchain: "x",
        pathSegments: ["{poolId}"],
      },
    });
    const { readChartProviders } = require("../src/chart-providers");
    const out = readChartProviders("pulsechain");
    assert.deepEqual(
      out.map((p) => p.key),
      ["ok"],
    );
  });

  it("drops entries missing the scheme", () => {
    _writeWithChartProviders({
      noScheme: {
        name: "Bad",
        domain: "bad.example",
        blockchain: "x",
        pathSegments: ["{poolId}"],
      },
    });
    const { readChartProviders } = require("../src/chart-providers");
    assert.deepEqual(readChartProviders("pulsechain"), []);
  });

  it("drops entries with non-array pathSegments", () => {
    _writeWithChartProviders({
      bad: {
        name: "Bad",
        scheme: "https",
        domain: "bad.example",
        blockchain: "x",
        pathSegments: "{blockchain}/{poolId}",
      },
    });
    const { readChartProviders } = require("../src/chart-providers");
    assert.deepEqual(readChartProviders("pulsechain"), []);
  });

  it("drops entries whose path has no {poolId} placeholder", () => {
    _writeWithChartProviders({
      noPoolId: {
        name: "Bad",
        scheme: "https",
        domain: "bad.example",
        blockchain: "x",
        pathSegments: ["pools"],
      },
    });
    const { readChartProviders } = require("../src/chart-providers");
    assert.deepEqual(readChartProviders("pulsechain"), []);
  });

  it("returns empty list when chartProviders key is absent", () => {
    fs.writeFileSync(_FILE, JSON.stringify({ pulsechain: { chainId: 369 } }));
    const { readChartProviders } = require("../src/chart-providers");
    assert.deepEqual(readChartProviders("pulsechain"), []);
  });
});

describe("chart-providers.handleChartProviders", () => {
  it("returns 200 with { providers: [...] } for the active chain", () => {
    const { handleChartProviders } = require("../src/chart-providers");
    let gotStatus = null;
    let gotBody = null;
    const jsonResponse = (_res, status, body) => {
      gotStatus = status;
      gotBody = body;
    };
    handleChartProviders({}, {}, jsonResponse);
    assert.equal(gotStatus, 200);
    assert.ok(Array.isArray(gotBody.providers));
    assert.ok(gotBody.providers.length >= 1);
  });
});
