/**
 * @file range-math.js
 * @module rangeMath
 * @description
 * Uniswap v3 / 9mm v3 tick and price math utilities.
 *
 * Uniswap v3 represents prices as square-root-price-X96 values (sqrtPriceX96)
 * and discretises the price space into integer "ticks" where each tick
 * corresponds to a 0.01% price move (tick spacing varies by fee tier).
 *
 * This module provides:
 *  - Conversion between sqrtPriceX96 ↔ human price
 *  - Conversion between price ↔ tick
 *  - Tick rounding to valid spacings
 *  - Range width calculation (new lower/upper given current price ± pct)
 *  - Token composition ratio within a range
 *
 * All math follows the Uniswap v3 white-paper formulas.
 *
 * @see {@link https://uniswap.org/whitepaper-v3.pdf}
 */

'use strict';

const { nearestUsableTick: _sdkNearestUsableTick } = require('@uniswap/v3-sdk');

/** 2^96 — the fixed-point denominator used by Uniswap v3. */
const Q96 = BigInt('0x1000000000000000000000000');

/** V3 tick bounds (int24 range). */
const MIN_TICK = -887272;
const MAX_TICK = 887272;

/** Tick spacing per fee tier. */
const TICK_SPACINGS = {
  100:   1,
  500:   10,
  2500:  50,
  3000:  60,
  10000: 200,
};

/**
 * Convert a sqrtPriceX96 value (as BigInt or string) to a human-readable
 * floating-point price.
 * price = (sqrtPriceX96 / 2^96)^2 × 10^(decimals0 − decimals1)
 *
 * @param {bigint|string} sqrtPriceX96
 * @param {number}        decimals0    Decimals of token0.
 * @param {number}        decimals1    Decimals of token1.
 * @returns {number}
 */
function sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1) {
  const sq  = BigInt(sqrtPriceX96);
  // Use scaled BigInt division to avoid Number overflow for large values.
  // We shift by 2^96 (not 2^192 all at once) to keep intermediate values
  // within a range where the final division produces a safe Number.
  // raw = (sq / Q96)^2, but we compute it as (sq^2 * SCALE) / Q96^2 / SCALE
  // to preserve precision.
  const SCALE = 10n ** 18n;
  const scaledRaw = (sq * sq * SCALE) / (Q96 * Q96);
  const raw = Number(scaledRaw) / Number(SCALE);
  return raw * Math.pow(10, decimals0 - decimals1);
}

/**
 * Convert a human-readable price to the nearest Uniswap v3 tick.
 * tick = floor( log(price × 10^(decimals1−decimals0)) / log(1.0001) )
 *
 * @param {number} price
 * @param {number} decimals0
 * @param {number} decimals1
 * @returns {number}
 */
function priceToTick(price, decimals0, decimals1) {
  if (price <= 0) throw new Error('priceToTick: price must be > 0');
  const adjusted = price * Math.pow(10, decimals1 - decimals0);
  const tick = Math.floor(Math.log(adjusted) / Math.log(1.0001));
  if (!Number.isFinite(tick)) {
    throw new Error(`priceToTick: result is not finite (price=${price}, d0=${decimals0}, d1=${decimals1})`);
  }
  return tick;
}

/**
 * Convert a tick to the corresponding human-readable price.
 * price = 1.0001^tick × 10^(decimals0−decimals1)
 *
 * @param {number} tick
 * @param {number} decimals0
 * @param {number} decimals1
 * @returns {number}
 */
function tickToPrice(tick, decimals0, decimals1) {
  return Math.pow(1.0001, tick) * Math.pow(10, decimals0 - decimals1);
}

/**
 * Round a raw tick to the nearest valid (usable) tick for a given fee tier.
 * Delegates to @uniswap/v3-sdk's nearestUsableTick which also clamps to
 * [MIN_TICK, MAX_TICK] — an extra safety net beyond our callers' bounds checks.
 * @param {number} tick
 * @param {number} feeTier  e.g. 500, 3000, 10000
 * @returns {number}
 */
function nearestUsableTick(tick, feeTier) {
  const spacing = TICK_SPACINGS[feeTier] ?? 60;
  return _sdkNearestUsableTick(tick, spacing);
}

/**
 * Compute new lower and upper ticks for a rebalance centered on currentPrice
 * with a ±widthPct range.
 *
 * @param {number} currentPrice   Current pool price (human units).
 * @param {number} widthPct       Half-width percentage (e.g. 20 means ±20%).
 * @param {number} feeTier        Pool fee tier (500 | 3000 | 10000).
 * @param {number} decimals0      Token0 decimals.
 * @param {number} decimals1      Token1 decimals.
 * @returns {{ lowerTick: number, upperTick: number, lowerPrice: number, upperPrice: number }}
 */
function computeNewRange(currentPrice, widthPct, feeTier, decimals0, decimals1) {
  const factor     = widthPct / 100;
  // Clamp lowerPrice to a tiny positive value to avoid log(0)
  const lowerPrice = Math.max(currentPrice * (1 - factor), Number.EPSILON);
  const upperPrice = currentPrice * (1 + factor);

  let lowerTick = nearestUsableTick(priceToTick(lowerPrice, decimals0, decimals1), feeTier);
  let upperTick = nearestUsableTick(priceToTick(upperPrice, decimals0, decimals1), feeTier);
  const spacing  = TICK_SPACINGS[feeTier] ?? 60;

  // Clamp to V3 int24 bounds
  if (lowerTick < MIN_TICK) lowerTick = nearestUsableTick(MIN_TICK, feeTier);
  if (upperTick > MAX_TICK) upperTick = nearestUsableTick(MAX_TICK, feeTier);

  // Guarantee lower < upper
  if (lowerTick >= upperTick) upperTick = lowerTick + spacing;

  // ── Containment: the current tick MUST be within [lowerTick, upperTick) ──
  // With narrow widths and coarse tick spacing, price-to-tick rounding can
  // push both boundaries above or below the current tick.  Shift the range
  // to contain the tick while preserving the computed width.
  const currentTick = priceToTick(currentPrice, decimals0, decimals1);
  const width = upperTick - lowerTick;
  if (currentTick < lowerTick) {
    lowerTick = Math.floor(currentTick / spacing) * spacing;
    upperTick = lowerTick + width;
  } else if (currentTick >= upperTick) {
    upperTick = (Math.floor(currentTick / spacing) + 1) * spacing;
    lowerTick = upperTick - width;
  }

  // Re-clamp after shift
  if (lowerTick < MIN_TICK) lowerTick = nearestUsableTick(MIN_TICK, feeTier);
  if (upperTick > MAX_TICK) upperTick = nearestUsableTick(MAX_TICK, feeTier);
  if (lowerTick >= upperTick) upperTick = lowerTick + spacing;

  // ── Postcondition: ticks must be valid V3 values ─────────────────────────
  if (lowerTick < MIN_TICK || upperTick > MAX_TICK || lowerTick >= upperTick) {
    throw new Error(
      `computeNewRange: invalid ticks [${lowerTick}, ${upperTick}] `
      + `(bounds: [${MIN_TICK}, ${MAX_TICK}])`,
    );
  }

  // Return tick-derived prices so callers get the actual range boundaries
  return {
    lowerTick,
    upperTick,
    lowerPrice: tickToPrice(lowerTick, decimals0, decimals1),
    upperPrice: tickToPrice(upperTick, decimals0, decimals1),
  };
}

/**
 * Compute the token0 value fraction of a v3 position using the Uniswap v3
 * sqrt-price formula.
 *
 * In a V3 concentrated liquidity position:
 *   amount0 ∝ 1/sqrt(P) − 1/sqrt(Pu)
 *   amount1 ∝ sqrt(P) − sqrt(Pl)
 * Value fraction of token0 = (amount0 × P) / (amount0 × P + amount1).
 *
 * Returns a value in [0, 1] representing the fraction of position value that
 * is token0 (1 = fully token0, 0 = fully token1).
 *
 * @param {number} currentPrice
 * @param {number} lowerPrice
 * @param {number} upperPrice
 * @returns {number}
 */
function compositionRatio(currentPrice, lowerPrice, upperPrice) {
  if (currentPrice <= lowerPrice) return 1;
  if (currentPrice >= upperPrice) return 0;
  const sqrtP  = Math.sqrt(currentPrice);
  const sqrtPl = Math.sqrt(lowerPrice);
  const sqrtPu = Math.sqrt(upperPrice);
  // amount0 proportional = 1/sqrtP - 1/sqrtPu
  const a0 = (1 / sqrtP) - (1 / sqrtPu);
  // amount1 proportional = sqrtP - sqrtPl
  const a1 = sqrtP - sqrtPl;
  // value0 = a0 * currentPrice, value1 = a1
  const v0 = a0 * currentPrice;
  const total = v0 + a1;
  if (total <= 0) return 0.5;
  return Math.max(0, Math.min(1, v0 / total));
}

/**
 * Calculate the token amounts in a V3 position from liquidity and tick range.
 * Uses the standard Uniswap V3 formulas.
 * @param {bigint}  liquidity    Position liquidity.
 * @param {number}  currentTick  Current pool tick.
 * @param {number}  tickLower    Position lower tick.
 * @param {number}  tickUpper    Position upper tick.
 * @param {number}  decimals0    Token0 decimals.
 * @param {number}  decimals1    Token1 decimals.
 * @returns {{amount0: number, amount1: number}}  Human-readable token amounts.
 */
function positionAmounts(liquidity, currentTick, tickLower, tickUpper, decimals0, decimals1) {
  const liq = Number(liquidity);
  const sqrtP  = Math.pow(1.0001, currentTick / 2);
  const sqrtPl = Math.pow(1.0001, tickLower / 2);
  const sqrtPu = Math.pow(1.0001, tickUpper / 2);
  let a0 = 0;
  let a1 = 0;
  if (currentTick < tickLower) {
    a0 = liq * (1 / sqrtPl - 1 / sqrtPu);
  } else if (currentTick >= tickUpper) {
    a1 = liq * (sqrtPu - sqrtPl);
  } else {
    a0 = liq * (1 / sqrtP - 1 / sqrtPu);
    a1 = liq * (sqrtP - sqrtPl);
  }
  return {
    amount0: a0 / Math.pow(10, decimals0),
    amount1: a1 / Math.pow(10, decimals1),
  };
}

/**
 * Check whether a price is within a [lower, upper] range (inclusive).
 * @param {number} price
 * @param {number} lower
 * @param {number} upper
 * @returns {boolean}
 */
function isInRange(price, lower, upper) {
  return price >= lower && price <= upper;
}

/**
 * Check whether a price is within a buffer distance of either range edge.
 * Used by the "near edge" trigger.
 * @param {number} price
 * @param {number} lower
 * @param {number} upper
 * @param {number} edgePct  Percentage of the range width to use as buffer (0–49).
 * @returns {boolean}
 */
function isNearEdge(price, lower, upper, edgePct) {
  const buffer = (upper - lower) * (edgePct / 100);
  return price < lower + buffer || price > upper - buffer;
}

/**
 * Re-centre the existing position's tick spread on the current tick,
 * preserving the original width.  Used during rebalance so the new
 * position keeps the same range width rather than applying rangeWidthPct.
 *
 * @param {number} currentTick  Current pool tick.
 * @param {number} tickLower    Existing position lower tick.
 * @param {number} tickUpper    Existing position upper tick.
 * @param {number} feeTier      Pool fee tier (500 | 3000 | 10000).
 * @param {number} decimals0    Token0 decimals.
 * @param {number} decimals1    Token1 decimals.
 * @returns {{ lowerTick: number, upperTick: number, lowerPrice: number, upperPrice: number }}
 */
function preserveRange(currentTick, tickLower, tickUpper, feeTier, decimals0, decimals1) {
  const spread  = tickUpper - tickLower;
  const half    = Math.floor(spread / 2);
  const spacing = TICK_SPACINGS[feeTier] ?? 60;

  // Round each boundary independently — the spread itself is already valid
  // because the original position's ticks were on-chain-enforced boundaries.
  let newLower = nearestUsableTick(currentTick - half, feeTier);
  let newUpper = nearestUsableTick(currentTick - half + spread, feeTier);

  // Ensure the range is at least as wide as the original (rounding may shrink)
  if ((newUpper - newLower) < spread) newUpper += spacing;

  // Clamp to V3 int24 bounds
  if (newLower < MIN_TICK) newLower = nearestUsableTick(MIN_TICK, feeTier);
  if (newUpper > MAX_TICK) newUpper = nearestUsableTick(MAX_TICK, feeTier);

  // Guarantee lower < upper
  if (newLower >= newUpper) newUpper = newLower + spacing;

  // ── Postcondition: ticks must be valid V3 values ─────────────────────────
  if (newLower < MIN_TICK || newUpper > MAX_TICK || newLower >= newUpper) {
    throw new Error(
      `preserveRange: invalid ticks [${newLower}, ${newUpper}] `
      + `(bounds: [${MIN_TICK}, ${MAX_TICK}])`,
    );
  }

  return {
    lowerTick:  newLower,
    upperTick:  newUpper,
    lowerPrice: tickToPrice(newLower, decimals0, decimals1),
    upperPrice: tickToPrice(newUpper, decimals0, decimals1),
  };
}

// ── exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sqrtPriceX96ToPrice,
  priceToTick,
  tickToPrice,
  nearestUsableTick,
  computeNewRange,
  preserveRange,
  compositionRatio,
  positionAmounts,
  isInRange,
  isNearEdge,
  TICK_SPACINGS,
  MIN_TICK,
  MAX_TICK,
};
