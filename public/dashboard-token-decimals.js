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
import { getLastStatus } from "./dashboard-data.js";

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

/*- True when a token's on-chain decimals look unreadable/invalid — drives the
 *  red notice. */
function _decimalsLookBad(idx) {
  const d = _currentDecimals(idx);
  return !(typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 77);
}

/*- Show the bad (red) or ok (neutral) notice for one token block. */
function _paintNotice(idx) {
  const bad = g("pdDecimalsBad" + idx);
  const ok = g("pdDecimalsOk" + idx);
  const isBad = _decimalsLookBad(idx);
  if (bad) bad.hidden = !isBad;
  if (ok) ok.hidden = isBad;
}

/** Populate both mini-forms from saved overrides (or the current on-chain
 *  decimals) and paint the notices. Called when Pool Details opens. */
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
    _paintNotice(idx);
  }
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
