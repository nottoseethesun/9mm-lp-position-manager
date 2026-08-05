/**
 * @file util/diagnostic/wallet-token-flow/render.js
 * @description
 * Every console-emitting function for `wallet-token-flow`.
 *
 * Split out of `index.js` along the same seam as the other
 * diagnostics' render modules: presentation only, no I/O and no
 * decisions. The scan loops and the arithmetic stay in the caller,
 * which is what lets this whole layer be tested by capturing console
 * output.
 *
 * The stakes are the report's readability rather than a number an
 * operator acts on directly: this tool answers "where did the tokens
 * go?", and a row whose direction, counterparty or amount is shaped
 * wrong sends someone hunting a transfer that never happened.
 */

"use strict";

const { fmtTs } = require("../_helpers");

/** Run banner: what was scanned, over which window, against which RPC. */
function renderHeader({
  wallet,
  tokens,
  fromSec,
  toSec,
  fromBlock,
  toBlock,
  rpcUrl,
}) {
  console.log("=".repeat(80));
  console.log("wallet-token-flow");
  console.log(`  wallet:  ${wallet}`);
  console.log(`  tokens:  ${tokens.join(", ")}`);
  console.log(
    `  window:  ${fmtTs(fromSec)}  →  ${fmtTs(toSec)}` +
      `  (blocks ${fromBlock}–${toBlock})`,
  );
  console.log(`  RPC:     ${rpcUrl}`);
  console.log("=".repeat(80));
}

/** Section heading for one token's transfers. */
function renderTokenHeading(symbol, tokenAddr, decimals) {
  console.log(`\n── ${symbol} @ ${tokenAddr}  (decimals=${decimals}) ──`);
}

/**
 * Said explicitly rather than left blank.
 *
 * An empty section and a section that never ran look identical on a
 * terminal, and the difference decides whether the operator widens the
 * window or goes looking elsewhere.
 */
function renderNoTransfers() {
  console.log("  (no transfers in window)");
}

/** Column headings for the transfer table. */
function renderTransferTableHeader() {
  console.log(
    "DIR  BLOCK     TIMESTAMP                 AMOUNT         " +
      " COUNTERPARTY                                TX",
  );
}

/**
 * One transfer row.
 *
 * @param {object} row  `{ dir, blockNumber, ts, amount, counterparty, tx }`
 *   — already resolved by the caller, so this function neither decodes
 *   logs nor looks anything up.
 * @param {Function} fmtAmount  Amount formatter (injected to keep the
 *   decimals convention owned by the caller).
 * @param {number} decimals
 */
function renderTransferRow(row, fmtAmount, decimals) {
  console.log(
    `${row.dir.padEnd(4)} ${String(row.blockNumber).padEnd(9)} ` +
      `${fmtTs(row.ts).padEnd(25)} ` +
      `${fmtAmount(row.amount, decimals).padStart(15)} ` +
      `${row.counterparty} ${row.tx}`,
  );
}

/**
 * Closing net-flow table.
 *
 * The sign is rendered explicitly and the magnitude formatted from the
 * absolute value: a bare negative would otherwise reach the formatter,
 * which is written for unsigned raw token units.
 *
 * @param {object[]} summaries  `{ symbol, sumIn, sumOut, decimals }`.
 * @param {Function} fmtAmount  Amount formatter.
 */
function renderSummary(summaries, fmtAmount) {
  console.log("\n" + "─".repeat(80));
  console.log("Net flow summary (Σ IN − Σ OUT, raw token units):");
  for (const s of summaries) {
    const net = s.sumIn - s.sumOut;
    const sign = net >= 0n ? "+" : "-";
    const mag = net < 0n ? -net : net;
    console.log(
      `  ${s.symbol.padEnd(10)}  ` +
        `in: ${fmtAmount(s.sumIn, s.decimals).padStart(15)}   ` +
        `out: ${fmtAmount(s.sumOut, s.decimals).padStart(15)}   ` +
        `net: ${sign}${fmtAmount(mag, s.decimals)}`,
    );
  }
  console.log("─".repeat(80));
  console.log("Done.");
}

module.exports = {
  renderHeader,
  renderTokenHeading,
  renderNoTransfers,
  renderTransferTableHeader,
  renderTransferRow,
  renderSummary,
};
