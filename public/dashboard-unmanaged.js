/**
 * @file dashboard-unmanaged.js
 * @description One-shot detail fetch for unmanaged LP positions.
 *   When the user views an unmanaged position, this module fetches live
 *   pool state, token prices, composition, and value from the server
 *   and populates the dashboard KPIs.
 */

import { g, botConfig, truncName, fmtNum, fmtDateTime } from './dashboard-helpers.js';
import { positionRangeVisual, _fmtUsd, loadInitialDeposit, setUnmanagedSyncing, updateRangePctLabels } from './dashboard-data.js';
import { updateILDebugData } from './dashboard-il-debug.js';
import { posStore } from './dashboard-positions.js';

/** Update the composition bar + labels, or show grey "no price data" state. */
function _applyComposition(d, pos) {
  const tn0 = truncName(pos.token0Symbol || '?', 12), tn1 = truncName(pos.token1Symbol || '?', 12);
  const c0 = g('c0'), c1 = g('c1'), cl0 = g('cl0'), cl1 = g('cl1');
  if (d.composition === null) {
    if (c0) { c0.style.width = '50%'; c0.style.background = '#555'; }
    if (c1) { c1.style.width = '50%'; c1.style.background = '#555'; }
    if (cl0) cl0.textContent = tn0 + ': no price data';
    if (cl1) cl1.textContent = tn1 + ': no price data';
  } else {
    const r0 = d.composition;
    if (c0) { c0.style.width = (r0 * 100).toFixed(1) + '%'; c0.style.background = ''; }
    if (c1) { c1.style.width = ((1 - r0) * 100).toFixed(1) + '%'; c1.style.background = ''; }
    if (cl0) cl0.textContent = '\u25A0 ' + tn0 + ': ' + (r0 * 100).toFixed(0) + '%';
    if (cl1) cl1.textContent = '\u25A0 ' + tn1 + ': ' + ((1 - r0) * 100).toFixed(0) + '%';
  }
}

/** Set a KPI element's text and color class. */
function _setKpi(id, val) {
  const el = g(id); if (!el) return;
  if (val === null || val === undefined) { el.textContent = '\u2014'; return; }
  el.textContent = _fmtUsd(val);
  el.className = el.className.replace(/\b(pos|neg|neu)\b/g, '') + ' ' + (val > 0.005 ? 'pos' : val < -0.005 ? 'neg' : 'neu');
}

/** Populate the Lifetime panel + subtitle from one-shot data. */
function _applyLifetime(d) {
  _setKpi('kpiNet', d.ltNetPnl !== undefined ? d.ltNetPnl : d.netPnl);
  _setKpi('ltProfit', d.ltProfit !== undefined ? d.ltProfit : d.profit);
  _setKpi('netIL', d.il);
  const ltDep = g('lifetimeDepositDisplay'); if (ltDep && d.entryValue > 0) ltDep.textContent = '$usd ' + d.entryValue.toFixed(2);
  // Lifetime breakdown: fees + priceChange + realized
  const bd = g('kpiNetBreakdown');
  if (bd && d.ltFees !== undefined) { const f = (d.ltFees || 0).toFixed(2), pc = d.ltPriceChange || 0; bd.textContent = f + (pc >= 0 ? ' + ' : ' \u2212 ') + Math.abs(pc).toFixed(2) + ' + 0.00'; }
  // Lifetime date range uses firstEpochDate (pool start), not current NFT mint
  const startDate = d.firstEpochDate || d.mintDate;
  const sub = g('kpiPnlPct'); if (sub) sub.textContent = startDate ? (startDate + ' \u2192 ' + new Date().toISOString().slice(0, 10)) : '';
  if (startDate) {
    const days = ((Date.now() - new Date(startDate).getTime()) / 86400000).toFixed(2);
    const ltLabel = g('ltPnlLabel'); if (ltLabel) ltLabel.textContent = 'Net Profit and Loss Return over ' + days + ' days';
  }
}

/** Set the ACTIVE/CLOSED badge from position liquidity. */
function _applyStatusBadge(pos) {
  const closed = pos.liquidity !== undefined && String(pos.liquidity) === '0';
  const el = g('curPosStatus');
  if (el) { el.textContent = closed ? 'CLOSED' : 'ACTIVE'; el.className = '9mm-pos-mgr-pos-status ' + (closed ? 'closed' : 'active'); }
}

/** Apply one-shot position details to the dashboard UI. */
function _apply(d, pos) {
  botConfig.price = d.poolState.price; botConfig.lower = d.lowerPrice; botConfig.upper = d.upperPrice;
  botConfig.tL = pos.tickLower; botConfig.tU = pos.tickUpper;
  const sym = truncName(pos.token1Symbol || '?', 12);
  const pml = g('pmlabel'); if (pml) { pml.textContent = fmtNum(d.poolState.price) + ' ' + sym; pml.title = String(d.poolState.price); }
  positionRangeVisual();
  updateRangePctLabels(d.poolState.price, d.lowerPrice, d.upperPrice);
  // ACTIVE/CLOSED badge
  _applyStatusBadge(pos);
  // Current panel KPIs — show $0.00 (not dash) for zero values on active positions
  _setKpi('kpiValue', d.value);
  _setKpi('pnlFees', d.feesUsd);
  _setKpi('pnlPrice', d.priceGainLoss);
  _setKpi('kpiDeposit', d.entryValue > 0 ? d.entryValue : null);
  _setKpi('kpiPnl', d.netPnl);
  _setKpi('curProfit', d.profit);
  _setKpi('curIL', d.il);
  _setKpi('pnlRealized', 0);
  // Position age + mint date
  if (d.mintTimestamp) {
    const dur = g('kpiPosDuration');
    if (dur) {
      const ms = Date.now() - d.mintTimestamp * 1000;
      const dd = Math.floor(ms / 86400000), hh = Math.floor((ms % 86400000) / 3600000), mm = Math.floor((ms % 3600000) / 60000);
      dur.textContent = 'Active: ' + dd + 'd ' + hh + 'h ' + mm + 'm \u00B7 Minted: ' + fmtDateTime(new Date(d.mintTimestamp * 1000));
    }
  }
  _applyLifetime(d);
  // Inject IL debug data so the "i" buttons work for unmanaged positions
  if (d.il !== null && d.il !== undefined && d.hodlAmount0 !== null) {
    const hodl = { hodlAmount0: d.hodlAmount0, hodlAmount1: d.hodlAmount1 };
    updateILDebugData({ pnlSnapshot: { totalIL: d.il, lifetimeIL: d.il,
      ilInputs: { lpValue: d.value, price0: d.price0, price1: d.price1, cur: hodl, lt: hodl } } }, posStore);
  }
  // Composition + balances
  _applyComposition(d, pos);
  const sw = g('sWpls'); if (sw) sw.textContent = d.amounts.amount0.toFixed(4);
  const su = g('sUsdc'); if (su) su.textContent = d.amounts.amount1.toFixed(4);
  // Position stats
  const tc = g('sTC'); if (tc && d.poolState.tick !== undefined) tc.textContent = d.poolState.tick;
}

/** Clear all KPIs to dashes before fetching new position data. */
function _resetKpis() {
  ['kpiValue', 'pnlFees', 'pnlPrice', 'kpiDeposit', 'kpiPnl', 'curProfit', 'curIL', 'pnlRealized',
    'kpiNet', 'ltProfit', 'netIL', 'kpiNetBreakdown', 'kpiPosDuration'].forEach(id => { const e = g(id); if (e) e.textContent = '\u2014'; });
  const sub = g('kpiPnlPct'); if (sub) sub.textContent = '';
}

/** Build the request body for position detail endpoints. */
function _detailBody(pos) {
  return { tokenId: pos.tokenId, token0: pos.token0, token1: pos.token1, fee: pos.fee,
    tickLower: pos.tickLower, tickUpper: pos.tickUpper, liquidity: String(pos.liquidity || 0),
    walletAddress: pos.walletAddress, contractAddress: pos.contractAddress, initialDeposit: loadInitialDeposit() || 0 };
}

/** Fetch and display details for an unmanaged position (two-phase). */
export async function fetchUnmanagedDetails(pos) {
  if (!pos?.tokenId || !pos?.token0 || !pos?.token1 || !pos?.fee) return;
  _resetKpis();
  const badge = g('syncBadge');
  setUnmanagedSyncing(true);
  if (badge) { badge.textContent = 'Syncing\u2026'; badge.classList.remove('done'); badge.style.background = ''; }
  const body = _detailBody(pos);
  const hdrs = { 'Content-Type': 'application/json' };
  // Phase 1: fast — pool state, value, composition, current P&L (renders immediately)
  try {
    const r1 = await fetch('/api/position/details', { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
    const d1 = await r1.json();
    if (d1.ok) _apply(d1, pos);
    else console.warn('[unmanaged] details error:', d1.error);
  } catch (e) { console.warn('[unmanaged] phase 1 failed:', e.message); }
  // Phase 2: slow — lifetime P&L (event scan + epoch reconstruction)
  try {
    const r2 = await fetch('/api/position/lifetime', { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
    const d2 = await r2.json();
    if (d2.ok) _applyLifetime(d2);
  } catch (e) { console.warn('[unmanaged] phase 2 failed:', e.message); }
  setUnmanagedSyncing(false);
  if (badge) { badge.textContent = 'Synced'; badge.classList.add('done'); badge.style.background = ''; }
}
