/**
 * @file dashboard-token-decimals.js
 * @description Manual per-token decimals override for the Pool Details dialog —
 *   a last-ditch fail-safe for rare tokens whose decimals can't be read
 *   on-chain (which otherwise auto-stops the position; see
 *   `src/bot-recorder-lifetime._ensureTokenDecimals`). Pool-scoped; persisted
 *   to localStorage + server config (`decimalsOverride0/1` +
 *   `decimalsOverrideForce0/1`, POSITION_KEYS). The heal consults these only
 *   when the on-chain read fails — or, with Force checked, always. Each token
 *   block shows a red notice when its decimals look unreadable, else a neutral
 *   advisory. Mirrors the shape of `dashboard-price-override.js`.
 */

import { g, compositeKey, fetchWithCsrf } from "./dashboard-helpers.js";
import { posStore } from "./dashboard-positions.js";
import { getLastStatus, isSyncComplete } from "./dashboard-data.js";

/*- The decimals this form shows and validates against come from the pool
 *  poll (`status.poolState`), which does not exist until the position has
 *  synced. Until then there is nothing to display and nothing to compare
 *  an entry to, so the controls stay disabled.
 *
 *  Only an explicit `true` counts as synced — the accessor returns
 *  true|false|null and null means no poll has landed yet. Same idiom as
 *  dashboard-events-manage.js. */
function _synced() {
  return isSyncComplete() === true;
}

/*- Pool-scoped localStorage key (token0_token1_fee) — matches the server-side
 *  scope so the override follows the pool across rebalances (new tokenId). */
function _key() {
  const a = posStore.getActive();
  if (!a || !a.token0 || !a.token1) return null;
  return (
    "9mm_decimals_override_" +
    a.token0.toLowerCase() +
    "_" +
    a.token1.toLowerCase() +
    "_" +
    (a.fee || 0)
  );
}

/** Load saved overrides `{ d0, force0, d1, force1 }`. Missing → `{}`. */
export function loadDecimalsOverrides() {
  const k = _key();
  if (!k) return {};
  try {
    const j = JSON.parse(localStorage.getItem(k));
    return j !== null && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

function _save(obj) {
  const k = _key();
  if (!k) return;
  try {
    localStorage.setItem(k, JSON.stringify(obj));
  } catch {
    /* localStorage may be unavailable (private mode); non-fatal. */
  }
}

/*- Parse an input string into a valid ERC-20 decimals integer [0,77], or
 *  null.  Explicit checks so "" / non-numeric / out-of-range never persist. */
function _parseDecimals(v) {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 77 ? n : null;
}

/*- The active position's on-chain decimals for token `idx`, from the last
 *  status poll's poolState (the same source the KPI panel reads). Returns a
 *  number or undefined. */
function _currentDecimals(idx) {
  const st = getLastStatus();
  const ps = st !== null && st !== undefined ? st.poolState : undefined;
  const d = ps !== null && ps !== undefined ? ps["decimals" + idx] : undefined;
  return typeof d === "number" ? d : undefined;
}

/**
 * Whether the red "couldn't be read on-chain" notice applies.
 *
 * Two distinct absences used to collapse into one answer. Before the
 * first poll there is no `poolState`, so `decimals` is undefined — not
 * because the read failed, but because it has not happened. Reporting
 * that as a failure told the operator to type a correct value in, at the
 * one moment when nothing was wrong and nothing could be checked against.
 *
 * Exported for tests: this predicate is the whole decision, and driving
 * it through a live poll would test the poller instead.
 *
 * @param {boolean} synced    Whether the position has finished syncing.
 * @param {number|undefined} decimals  On-chain decimals, if known.
 * @returns {boolean} True only when a value is knowable AND invalid.
 */
export function _isDecimalsBad(synced, decimals) {
  if (!synced) return false;
  return !(
    typeof decimals === "number" &&
    Number.isInteger(decimals) &&
    decimals >= 0 &&
    decimals <= 77
  );
}

/*- Enable or disable one token's mini-form.
 *
 *  Covers the Force checkbox and Save button as well as the input:
 *  leaving Save live beside a disabled field would let the empty value
 *  be persisted as an override, which is the opposite of the intent. */
function _setEnabled(idx, enabled) {
  for (const id of ["pdDecimals", "pdDecimalsForce", "pdDecimalsSave"]) {
    const el = g(id + idx);
    if (el) el.disabled = !enabled;
  }
}

/*- Show the bad (red) or ok (neutral) notice for one token block. */
function _paintNotice(idx) {
  const bad = g("pdDecimalsBad" + idx);
  const ok = g("pdDecimalsOk" + idx);
  const isBad = _isDecimalsBad(_synced(), _currentDecimals(idx));
  if (bad) bad.hidden = !isBad;
  if (ok) ok.hidden = isBad;
}

/*- The sync state the dialog was last painted for.
 *
 *  Lets `refreshDecimalsOverrideOnPoll` act on the false→true transition
 *  instead of every poll. Repainting unconditionally would overwrite a
 *  value the operator was midway through typing, three seconds at a time.
 *  null = not painted (dialog closed). */
let _paintedSynced = null;

/** Populate both mini-forms from saved overrides (or the current on-chain
 *  decimals), set their enabled state, and paint the notices. Called when
 *  Pool Details opens. */
export function populateDecimalsOverride() {
  const ov = loadDecimalsOverrides();
  for (const idx of [0, 1]) {
    const input = g("pdDecimals" + idx);
    const force = g("pdDecimalsForce" + idx);
    if (input) {
      const saved = ov["d" + idx];
      const cur = _currentDecimals(idx);
      input.value =
        typeof saved === "number"
          ? String(saved)
          : typeof cur === "number"
            ? String(cur)
            : "";
    }
    if (force) force.checked = ov["force" + idx] === true;
    _setEnabled(idx, _synced());
    _paintNotice(idx);
  }
  _paintedSynced = _synced();
}

/**
 * Re-paint the mini-forms when sync completes while the dialog is open.
 *
 * Token decimals are critical: if the dialog was opened during sync and
 * the decimals then turn out to be genuinely unreadable, the operator
 * needs the field live and the red notice showing — not controls frozen
 * in their pre-sync state until they think to close and reopen.
 *
 * Rides the existing status poll rather than starting a timer, so it runs
 * at the dashboard's base heartbeat and adds no cadence of its own.
 *
 * Acts only on the false→true transition. Repainting every poll would
 * refill the input from the on-chain value every few seconds, wiping out
 * whatever the operator was typing.
 */
export function refreshDecimalsOverrideOnPoll() {
  const modal = g("poolDetailsModal");
  /*- Closed: forget the painted state so the next open repaints from
   *  scratch rather than being skipped as "already current". */
  if (!modal || modal.classList.contains("hidden")) {
    _paintedSynced = null;
    return;
  }
  if (_synced() === _paintedSynced) return;
  populateDecimalsOverride();
}

/*- Persist both tokens' overrides to server config for the active position. */
function _persistToServer(ov) {
  const a = posStore.getActive();
  if (!a) return;
  const pk = compositeKey(
    "pulsechain",
    a.walletAddress,
    a.contractAddress,
    a.tokenId,
  );
  fetchWithCsrf("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decimalsOverride0: ov.d0 ?? null,
      decimalsOverride1: ov.d1 ?? null,
      decimalsOverrideForce0: ov.force0 === true,
      decimalsOverrideForce1: ov.force1 === true,
      positionKey: pk,
    }),
  }).catch(() => {});
}

/** Save one token's decimals override (localStorage + server), then repaint. */
export function saveDecimalsOverride(idx) {
  const ov = loadDecimalsOverrides();
  const input = g("pdDecimals" + idx);
  const force = g("pdDecimalsForce" + idx);
  ov["d" + idx] = input ? _parseDecimals(input.value) : null;
  ov["force" + idx] = force ? force.checked === true : false;
  _save(ov);
  _persistToServer(ov);
  _paintNotice(idx);
}
