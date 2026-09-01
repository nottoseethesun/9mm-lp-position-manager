/**
 * @file src/range-override.js
 * @module range-override
 * @description
 * Single source of truth for the per-position "No Override" toggle that
 * heads the Bot Settings → Range section.
 *
 * The toggle answers one question: does the next rebalance shape its
 * tick range from the saved Range settings, or does it simply re-use the
 * position's existing on-chain range?
 *
 *   - toggle ON  ("No Override")  → `rangeOverrideEnabled === false`
 *     Badge reads "Re-Use Existing Position Range".  `buildRebalanceOpts`
 *     withholds `rebalanceRangeWidthPct` and `fullRangeRebalanceEnabled`
 *     and pins the offset to the shipped default, so `_computeRange` in
 *     `rebalancer-execute.js` lands on `rangeMath.preserveRange()`
 *     centred on the current tick.
 *   - toggle OFF                  → `rangeOverrideEnabled === true`
 *     Badge reads "Use Settings Below".  The saved Price Range Extension,
 *     Full-Range flag, and Position Offset all apply as before.
 *
 * The toggle is deliberately **non-destructive**: flipping it ON leaves
 * every saved Range value on disk (the dashboard greys the fields out
 * rather than emptying them), so flipping it back OFF restores the
 * user's settings exactly.  That is the whole reason it replaced the old
 * one-way "No Override" button, which cleared the keys outright.
 *
 * `resolveRangeOverrideEnabled` is the ONLY place the unset-slot default
 * is decided.  The server calls it from `bot-cycle-opts.js` (what the
 * bot actually does) and from `build-status-positions.js` (what
 * `GET /api/status` publishes), so the dashboard reads a value that is
 * already resolved and never re-derives the rule client-side.
 */

"use strict";

const { loadShippedDefaults } = require("./load-merged-defaults");

/*- Default for a position that has never been configured.  Per
 *  feedback_one_literal_per_shipped_default the literal lives only in
 *  bot-config-defaults.json. */
const _DEFAULTS = loadShippedDefaults("bot-config-defaults.json");

/**
 * Per-position config keys that constitute a Range override.  A slot
 * carrying any of these was configured before the toggle existed, so an
 * absent `rangeOverrideEnabled` resolves to `true` for it — upgrading
 * must never silently stop applying settings a live position already
 * relies on.
 */
const RANGE_OVERRIDE_KEYS = [
  "rebalanceRangeWidthPct",
  "fullRangeRebalanceEnabled",
  "offsetToken0Pct",
];

/**
 * Whether a saved Range override is in force for a position.
 *
 * Resolution order:
 *   1. An explicit boolean `rangeOverrideEnabled` wins — the user has
 *      touched the toggle, so their choice is authoritative.
 *   2. A slot already carrying a Price Range Extension, a `true`
 *      Full-Range flag, or a Position Offset resolves to `true`.  Those
 *      slots predate the toggle; upgrading must not silently stop
 *      applying settings a live position already relies on.
 *   3. Otherwise the shipped default — an empty slot, i.e. every
 *      position the first time it is seen, means "No Override".
 *
 * @param {object|null|undefined} posCfg  A position's config slot (or any
 *   object exposing the same keys, e.g. the bag `bot-cycle-opts.js`
 *   assembles from `deps._getConfig`).
 * @returns {boolean}  `true` → apply the saved Range settings.
 */
function resolveRangeOverrideEnabled(posCfg) {
  if (posCfg === undefined || posCfg === null)
    return _DEFAULTS.rangeOverrideEnabled;
  if (typeof posCfg.rangeOverrideEnabled === "boolean")
    return posCfg.rangeOverrideEnabled;
  /*- `fullRangeRebalanceEnabled` only counts when it is `true`: an
   *  explicitly-saved `false` means the user unchecked the box, which
   *  is the absence of an override, not the presence of one. */
  if (posCfg.fullRangeRebalanceEnabled === true) return true;
  for (const k of RANGE_OVERRIDE_KEYS) {
    if (k === "fullRangeRebalanceEnabled") continue;
    if (posCfg[k] !== undefined && posCfg[k] !== null) return true;
  }
  return _DEFAULTS.rangeOverrideEnabled;
}

module.exports = { resolveRangeOverrideEnabled, RANGE_OVERRIDE_KEYS };
