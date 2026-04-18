/**
 * @file dashboard-mission-badge.js
 * @description Mission Control "Special Action" status badge painter
 * and optimistic-latch helper. Split from dashboard-data.js for
 * line-count compliance.
 */
import { g } from "./dashboard-helpers.js";

/*- Optimistic latches so the badge flips immediately on click, before
 * the bot-cycle (up to CHECK_INTERVAL_SEC) picks up the request. The
 * latch clears on first real confirmation from the server, or after
 * _OPT_TIMEOUT_MS as a safety reset if the bot never reported back. */
let _optimisticCompound = false;
let _optimisticRebalance = false;
let _optimisticCompoundTimer = null;
let _optimisticRebalanceTimer = null;
const _OPT_TIMEOUT_MS = 90_000;

/**
 * Mark a special action as optimistically in-progress. The badge will
 * show the Rebalancing / Compounding state immediately until either
 * the server confirms it, or _OPT_TIMEOUT_MS elapses.
 * @param {"compound"|"rebalance"} kind
 */
export function setOptimisticSpecialAction(kind) {
  if (kind === "compound") {
    _optimisticCompound = true;
    clearTimeout(_optimisticCompoundTimer);
    _optimisticCompoundTimer = setTimeout(() => {
      _optimisticCompound = false;
    }, _OPT_TIMEOUT_MS);
  } else if (kind === "rebalance") {
    _optimisticRebalance = true;
    clearTimeout(_optimisticRebalanceTimer);
    _optimisticRebalanceTimer = setTimeout(() => {
      _optimisticRebalance = false;
    }, _OPT_TIMEOUT_MS);
  }
}

/**
 * Paint the Mission Control "Special Action" badge.
 * @param {object} d      Status payload from /api/status.
 * @param {boolean} rebOn Whether a rebalance is in progress.
 */
export function updateMissionStatusBadge(d, rebOn) {
  const badge = g("missionStatusBadge");
  if (!badge) return;
  const text = g("missionStatusText");
  if (d.compoundInProgress) _optimisticCompound = false;
  if (rebOn) _optimisticRebalance = false;
  const rebView = rebOn || _optimisticRebalance;
  const cmpView = d.compoundInProgress || _optimisticCompound;
  let label = "Special Action: None";
  let active = false;
  if (rebView) {
    label = "Special Action: Rebalancing";
    active = true;
  } else if (cmpView) {
    label = "Special Action: Compounding";
    active = true;
  }
  if (text) text.textContent = label;
  badge.classList.toggle("active", active);
}
