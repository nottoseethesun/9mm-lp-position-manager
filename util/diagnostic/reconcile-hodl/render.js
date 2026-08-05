/**
 * @file util/diagnostic/reconcile-hodl/render.js
 * @description
 * Every console-emitting function for `reconcile-hodl`.
 *
 * Split out of `index.js` along the same seam as
 * `verify-compound-usd/render.js`: this module owns presentation only.
 * It performs no I/O and decides nothing — the RPC walking and the
 * aggregate arithmetic stay in `index.js` — which is what
 * makes the whole layer testable by capturing console output.
 *
 * That matters here more than the line count. The report IS the
 * product of this tool: an operator reads the Δ and decides whether a
 * HODL baseline is wrong. A mis-scaled figure or a delta printed with
 * the wrong sign would send them to clear a baseline that was fine, or
 * leave a broken one in place.
 *
 * `toFloat` and `fmtDelta` live here rather than in the caller so the
 * dependency runs one way (reconcile-hodl -> render) with no import
 * cycle; both exist purely to shape numbers for display.
 */

"use strict";

/** BigInt → human float using token decimals. */
function toFloat(big, decimals) {
  if (big === 0n) return 0;
  const s = big.toString().padStart(decimals + 1, "0");
  const i = s.slice(0, -decimals) || "0";
  const f = s.slice(-decimals);
  return Number(`${i}.${f}`);
}

/** Pretty diff between cached and on-chain. */
function fmtDelta(actual, cached, decimals) {
  const a = toFloat(actual, decimals);
  if (cached === undefined || cached === null || !Number.isFinite(cached))
    return `${a.toFixed(6)}  (cached: —)`;
  const d = a - Number(cached);
  const sign = d >= 0 ? "+" : "";
  return (
    `${a.toFixed(6)}  (cached: ${Number(cached).toFixed(6)},` +
    ` Δ ${sign}${d.toFixed(6)})`
  );
}

/** Title block naming the position under examination. */
function renderBanner(key) {
  console.log("=".repeat(80));
  console.log(`reconcile-hodl: ${key}`);
  console.log("=".repeat(80));
  console.log("Reading current position metadata from chain...");
}

/** The pool identity the NFT chain is filtered against. */
function renderTarget(target) {
  console.log(`  token0: ${target.token0}`);
  console.log(`  token1: ${target.token1}`);
  console.log(`  fee:    ${target.fee}`);
}

/** Column headings for the per-NFT table. */
function renderTableHeader() {
  console.log("");
  console.log(
    "tokenId             IL_count  IL amount0       IL amount1      " +
      " DL_count  Col_count",
  );
}

/**
 * One row of the per-NFT table.
 *
 * @param {string} tid        Token id.
 * @param {object} ev         `{ ilEvents, dlEvents, collectEvents }`.
 * @param {object} il         Summed IL amounts `{ s0, s1 }`.
 * @param {number} decimals0
 * @param {number} decimals1
 */
function renderChainRow(tid, ev, il, decimals0, decimals1) {
  const c0 = toFloat(il.s0, decimals0).toFixed(6).padStart(15);
  const c1 = toFloat(il.s1, decimals1).toFixed(6).padStart(15);
  console.log(
    `${tid.padEnd(20)} ${String(ev.ilEvents.length).padStart(8)}  ` +
      `${c0}  ${c1}  ${String(ev.dlEvents.length).padStart(8)}  ` +
      `${String(ev.collectEvents.length).padStart(8)}`,
  );
}

/** The Σ block: gross deposits, drains, collections and the derived pair. */
function renderAggregates(sums, derived, decimals0, decimals1) {
  console.log("\n" + "─".repeat(80));
  console.log("Aggregates (across full NFT chain):");
  console.log(
    `  Σ IncreaseLiquidity  amount0: ${toFloat(sums.ilSum0, decimals0).toFixed(6)}` +
      `   amount1: ${toFloat(sums.ilSum1, decimals1).toFixed(6)}`,
  );
  console.log(
    `  Σ DecreaseLiquidity  amount0: ${toFloat(sums.dlSum0, decimals0).toFixed(6)}` +
      `   amount1: ${toFloat(sums.dlSum1, decimals1).toFixed(6)}`,
  );
  console.log(
    "  Σ Collect            amount0: " +
      `${toFloat(sums.colSum0, decimals0).toFixed(6)}` +
      `   amount1: ${toFloat(sums.colSum1, decimals1).toFixed(6)}`,
  );
  console.log(
    "  Net principal (IL−DL): amount0 " +
      `${toFloat(derived.netPrincipal0, decimals0).toFixed(6)}  amount1 ` +
      `${toFloat(derived.netPrincipal1, decimals1).toFixed(6)}`,
  );
  console.log(
    `  Approx lifetime fees:  amount0 ${toFloat(derived.fees0, decimals0).toFixed(6)}` +
      `  amount1 ${toFloat(derived.fees1, decimals1).toFixed(6)}`,
  );
}

/** The on-chain-vs-cached comparison — the answer the tool exists for. */
function renderReconciliation(sums, cachedHb, decimals0, decimals1) {
  console.log("");
  console.log("HODL baseline reconciliation:");
  console.log(
    "  hodlAmount0:  on-chain Σ IL = " +
      fmtDelta(sums.ilSum0, cachedHb.hodlAmount0, decimals0),
  );
  console.log(
    "  hodlAmount1:  on-chain Σ IL = " +
      fmtDelta(sums.ilSum1, cachedHb.hodlAmount1, decimals1),
  );
}

/** How to read a large Δ, and what to do about it. */
function renderNotes() {
  console.log("");
  console.log(
    "Notes: cached HODL is set once at first-mint detection; subsequent",
  );
  console.log(
    "  fresh deposits should grow it via the lifetime-deposit path.  A large",
  );
  console.log(
    "  Δ here means the cache and chain disagree — possible causes: a failed",
  );
  console.log(
    "  rebalance TX wasn't reconciled, or a fresh deposit was misclassified",
  );
  console.log(
    "  as a compound (or vice versa).  Re-running on a fresh restart with the",
  );
  console.log("  baseline cleared will rebuild it from chain.");
  console.log("─".repeat(80));
  console.log("Done.");
}

/**
 * The full closing report.
 *
 * @param {object} opts
 * @param {object} opts.sums      Raw BigInt sums across the NFT chain.
 * @param {object} opts.derived   Output of `deriveAggregates`.
 * @param {object} opts.cachedHb  Cached `hodlBaseline` (may be empty).
 * @param {number} opts.decimals0
 * @param {number} opts.decimals1
 */
function renderReport({ sums, derived, cachedHb, decimals0, decimals1 }) {
  renderAggregates(sums, derived, decimals0, decimals1);
  renderReconciliation(sums, cachedHb, decimals0, decimals1);
  renderNotes();
}

module.exports = {
  toFloat,
  fmtDelta,
  renderBanner,
  renderTarget,
  renderTableHeader,
  renderChainRow,
  renderAggregates,
  renderReconciliation,
  renderNotes,
  renderReport,
};
