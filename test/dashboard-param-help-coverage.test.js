/**
 * @file test/dashboard-param-help-coverage.test.js
 * @description
 * Pins the contract between the circle-i buttons in the markup and the
 * help content they open.
 *
 * `showParamHelp` does `if (!entry) return;` — an unknown key is a
 * silent no-op. So a typo'd or renamed `data-param-help` value ships a
 * circle-i that looks live, gets clicked, and does nothing. Lint can't
 * see it (the key is a string in an HTML attribute), and no test did
 * either until this one.
 *
 * Also guards the shipped-default bounds for the Price Range Extension
 * "Default" button, and the wording of the two fee dialogs — the
 * Current panel's "Fees Earned" tooltip previously asserted the exact
 * opposite of what the code computes, which is the kind of error that
 * survives indefinitely because nothing but a reader can catch it.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "public", "index.html");

/** Every `data-param-help="…"` key used in the markup. */
function markupKeys() {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  return [
    ...new Set(
      [...html.matchAll(/data-param-help="([^"]+)"/g)].map((m) => m[1]),
    ),
  ];
}

/**
 * PARAM_HELP, read from the ES module.
 *
 * `param-help-content.js` is browser ES-module source with no runtime
 * dependencies, so a dynamic import reads the real object rather than a
 * re-parsed copy that could drift from what the dashboard bundles.
 */
async function paramHelp() {
  const mod = await import("../public/param-help-content.js");
  return mod.PARAM_HELP;
}

test("every data-param-help key in the markup has help content", async () => {
  const help = await paramHelp();
  const missing = markupKeys().filter((k) => !help[k]);
  assert.deepEqual(
    missing,
    [],
    `circle-i buttons with no PARAM_HELP entry (they would open nothing): ${missing.join(", ")}`,
  );
});

test("the markup actually uses param-help keys", async () => {
  /*- Without this, a regex that stopped matching would make the test
   *  above pass forever over an empty list. */
  assert.ok(markupKeys().length > 10, "expected many circle-i buttons");
});

test("every help entry is renderable — title plus real sections", async () => {
  const help = await paramHelp();
  for (const [key, entry] of Object.entries(help)) {
    assert.ok(entry.title, `${key}: needs a title`);
    assert.ok(
      Array.isArray(entry.sections) && entry.sections.length > 0,
      `${key}: needs at least one section`,
    );
    for (const s of entry.sections) {
      assert.ok(s.heading, `${key}: a section is missing its heading`);
      assert.ok(s.body, `${key}: section "${s.heading}" has no body`);
    }
  }
});

/* ---------- the two Current-panel fee dialogs ---------- */

test("Fees Earned and Fees Compounded both open a help dialog", async () => {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  /*- Both rows carry a circle-i wired to the shared param-help system,
   *  not a bare `title` tooltip. */
  for (const [row, key] of [
    ["pnlFees", "curFees"],
    ["pnlCompounded", "curCompounded"],
  ]) {
    const line = html
      .split("\n")
      .find(
        (l) => l.includes(`id="${row}"`) && l.includes("9mm-pos-mgr-pnl-row"),
      );
    assert.ok(line, `${row} row not found`);
    assert.match(
      line,
      new RegExp(`data-param-help="${key}"`),
      `the ${row} row must open the ${key} dialog`,
    );
  }
});

test("the old Fees Earned tooltip — which was backwards — is gone", async () => {
  /*- It read "Includes any fees that were compounded."  `feesUsd` in
   *  src/bot-pnl-updater.js is tokensOwed0*price0 + tokensOwed1*price1,
   *  i.e. UNCLAIMED fees only; compounding zeroes tokensOwed.  The two
   *  figures are disjoint, which is why the code adds them. */
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  assert.equal(
    html.includes("Includes any fees that were compounded"),
    false,
    "the corrected wording must not regress",
  );
});

test("curFees says compounded fees are NOT included, and where they are", async () => {
  const help = await paramHelp();
  const text = help.curFees.sections.map((s) => s.body).join(" ");
  assert.match(text, /does <strong>not<\/strong> include fees compounded/i);
  assert.match(text, /line directly below/i, "points at where to find them");
});

test("both Current fee dialogs offer Re-scan Prices as the remedy", async () => {
  const help = await paramHelp();
  for (const key of ["curFees", "curCompounded"]) {
    const text = help[key].sections.map((s) => s.body).join(" ");
    assert.match(text, /Re-scan Prices/, `${key}: names the remedy`);
    assert.match(text, /gear\s+icon at top right/i, `${key}: says where`);
  }
});

test("curCompounded scopes itself to this NFT, not the whole chain", async () => {
  /*- snap.currentCompoundedUsd sums compoundHistory rows matching the
   *  CURRENT tokenId (src/bot-pnl-current-nft.js), while the Lifetime
   *  figure spans every NFT in the rebalance chain.  Conflating them
   *  would make the two panels look like they disagree. */
  const help = await paramHelp();
  const text = help.curCompounded.sections.map((s) => s.body).join(" ");
  assert.match(text, /this NFT|NFT you are looking at/i);
  assert.match(text, /Lifetime/, "points at the panel with the full figure");
});

test("the Lifetime Fees Compounded dialog gained the price-feed section", async () => {
  const help = await paramHelp();
  const sections = help.ltCompounded.sections;
  const last = sections[sections.length - 1];
  assert.equal(
    last.heading,
    "If the number looks off",
    "the new section goes after the existing last one",
  );
  assert.match(last.body, /Re-scan Prices/);
  /*- The pre-existing sections must survive the append. */
  const headings = sections.map((s) => s.heading);
  assert.ok(headings.includes("What it includes"));
  assert.ok(headings.includes("Why this figure may slightly overstate"));
});

/* ---------- shipped default for the Price Range Extension button ---------- */

test("the shipped Price Range Extension default is within its validator bounds", async () => {
  /*- The "Default" button injects this straight into the input.  A
   *  value outside 0.1..200 would be clamped elsewhere and the button
   *  would appear to do the wrong thing. */
  const shipped = require("../app-config/app-defaults-for-user-configurable/bot-config-defaults.json");
  const v = shipped.rebalanceRangeWidthPct;
  assert.equal(typeof v, "number");
  assert.ok(v >= 0.1 && v <= 200, `out of range: ${v}`);
});

test("the Price Range Extension default is not below the input's min", async () => {
  const shipped = require("../app-config/app-defaults-for-user-configurable/bot-config-defaults.json");
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  const line = html.split("\n").find((l) => l.includes('id="inRangeWidth"'));
  const min = Number(/min="([\d.]+)"/.exec(line)[1]);
  assert.ok(
    shipped.rebalanceRangeWidthPct >= min,
    `default ${shipped.rebalanceRangeWidthPct} is below the input min ${min}`,
  );
});
