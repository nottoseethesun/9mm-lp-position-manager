/**
 * @file rebalancer-aggregator.js
 * @description 9mm DEX Aggregator swap path for the rebalancer.
 *   Fetches quotes from the aggregator API, submits TXs with
 *   cancel-and-requote retry on timeout. Used as the primary
 *   swap path; V3 router in rebalancer-swap.js is the fallback.
 *
 *   Chain-specific tunables (cancel gas multiplier, wait timeout,
 *   max attempts) are loaded from config/chains.json via config.CHAIN.
 */

'use strict';

const config = require('./config');
const {
  ERC20_ABI,
  _checkSwapImpact,
  _ensureAllowance,
} = require('./rebalancer-pools');

/** Chain-specific aggregator tunables from config/chains.json. */
const _agg = config.CHAIN.aggregator;

/**
 * Fetch a quote from the 9mm DEX Aggregator.
 * @param {string} sellToken  Sell token address.
 * @param {string} buyToken   Buy token address.
 * @param {bigint} sellAmount Amount in base units.
 * @param {number} slippagePct Slippage as a percentage (e.g. 0.5).
 * @returns {Promise<object>} Quote response.
 */
async function _fetchQuote(
  sellToken, buyToken, sellAmount, slippagePct) {
  const slip = (slippagePct ?? 0.5) / 100;
  // No takerAddress — the 9mm web UI omits it, and including it
  // causes the API to generate different calldata that reverts on-chain.
  const url = config.AGGREGATOR_URL + '/swap/v1/quote'
    + '?sellToken=' + sellToken + '&buyToken=' + buyToken
    + '&sellAmount=' + String(sellAmount)
    + '&slippagePercentage=' + slip
    + '&includedSources=';
  console.log('[aggregator] GET %s', url);
  const res = await fetch(url, { headers: {
    'Accept': 'application/json',
    '0x-api-key': config.AGGREGATOR_API_KEY || '',
  } });
  if (!res.ok) {
    let body = '';
    try {
      const json = await res.json();
      const reason = json.reason || json.code || '';
      const valErrs = (json.validationErrors || [])
        .map((e) => `${e.field}: ${e.reason}`).join('; ');
      const balIssue = json.issues?.balance
        ? `balance: actual=${json.issues.balance.actual}`
          + ` expected=${json.issues.balance.expected}`
        : '';
      const allowIssue = json.issues?.allowance
        ? `allowance: actual=${json.issues.allowance.actual}`
          + ` spender=${json.issues.allowance.spender}`
        : '';
      body = [reason, valErrs, balIssue, allowIssue]
        .filter(Boolean).join(' | ');
    } catch { /* response wasn't JSON */ }
    throw new Error(
      'Aggregator API: HTTP ' + res.status
      + (body ? ' — ' + body : ''));
  }
  const json = await res.json();
  if (config.VERBOSE) {
    console.log('[aggregator] Response: %s', JSON.stringify(json));
  } else {
    const brief = { ...json,
      data: '"Elided B.l.o.b. - run in --verbose mode to see"' };
    if (brief.orders) brief.orders = brief.orders.map((o) => {
      const b = { ...o };
      if (b.fillData) b.fillData = { ...b.fillData };
      if (b.fillData?.uniswapPath)
        b.fillData.uniswapPath =
          '"Elided B.l.o.b. - run in --verbose mode to see"';
      return b;
    });
    console.log('[aggregator] Response: %s', JSON.stringify(brief));
  }
  return json;
}

/** Compute gas cost from a TX receipt. */
function _gasCost(r) {
  return (r.gasUsed ?? 0n) * (r.gasPrice ?? r.effectiveGasPrice ?? 0n);
}

/** Cancel a pending nonce with a 0-value self-transfer at higher gas. */
async function _cancelNonce(signer, provider, nonce, waitMs) {
  const fd = await provider.getFeeData();
  const baseFee = fd.maxFeePerGas ?? fd.gasPrice ?? 0n;
  const cancelFee = BigInt(
    Math.ceil(Number(baseFee) * _agg.cancelGasMultiplier));
  const addr = await signer.getAddress();
  const c = await signer.sendTransaction({
    to: addr, value: 0, nonce,
    maxFeePerGas: cancelFee,
    maxPriorityFeePerGas: cancelFee,
    gasLimit: 21000,
  });
  await Promise.race([
    c.wait().catch(() => {}),
    new Promise((r) => setTimeout(r, waitMs)),
  ]);
}

/** Handle a retryable aggregator error (timeout or on-chain revert). */
async function _handleSwapError(
  err, signer, provider, nonce, waitMs, fromSym, toSym,
) {
  if (err.message === '_AGG_TIMEOUT') {
    console.warn(
      '[rebalance] swap (aggregator): %s -> %s not confirmed'
        + ' in %ds — cancelling nonce %d (%sx gas)',
      fromSym, toSym,
      waitMs / 1000, nonce,
      String(_agg.cancelGasMultiplier));
    await _cancelNonce(signer, provider, nonce, waitMs);
    console.log(
      '[rebalance] swap (aggregator): nonce %d cancelled'
        + ' (or original confirmed)',
      nonce);
  } else {
    console.warn(
      '[rebalance] swap (aggregator): %s -> %s reverted'
        + ' on-chain (gasUsed=%s) — re-quoting',
      fromSym, toSym,
      String(err.receipt?.gasUsed ?? '?'));
  }
}

/**
 * Submit aggregator TX with retry on both timeout and on-chain revert.
 *
 * Two failure modes, same recovery (fresh quote + retry):
 *  - Timeout: TX not mined in waitMs → cancel nonce, then re-quote.
 *  - On-chain revert (CALL_EXCEPTION, status=0): route's encoded pool
 *    states went stale between quote and execution. Nonce is already
 *    consumed — just re-quote and submit at the next nonce.
 *
 * Chain-specific tunables (waitMs, cancelGasMultiplier, maxAttempts)
 * come from config/chains.json.
 */
async function _sendWithRetry(
  signer, provider, quote, slippagePct,
  tokenIn, tokenOut, amountIn,
  symIn, symOut,
) {
  const waitMs = _agg.waitMs;
  const maxAttempts = _agg.maxAttempts;
  const fromSym = symIn || tokenIn.slice(0, 10);
  const toSym = symOut || tokenOut.slice(0, 10);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Use API-provided gas limit (includes buffer) per 0x docs;
    // fall back to estimatedGas only if gas field is absent.
    const gl = BigInt(quote.gas || quote.estimatedGas || 300000);
    // Don't override gas pricing — let ethers.js + provider handle it,
    // matching what MetaMask/web UI does. Explicit gasPrice (type 0) and
    // explicit maxFeePerGas (type 2) both caused failures; letting the
    // provider estimate naturally is the approach that works in the web UI.
    console.log(
      '[rebalance] swap (aggregator attempt %d/%d):'
        + ' %s -> %s data=%d bytes gasLimit=%s',
      attempt, maxAttempts,
      fromSym, toSym,
      (quote.data || '').length, String(gl));
    const tx = await signer.sendTransaction({
      to: quote.to, data: quote.data,
      value: BigInt(quote.value || 0),
      gasLimit: gl,
    });
    console.log(
      '[rebalance] swap (aggregator): TX hash=%s nonce=%d',
      tx.hash, tx.nonce);
    try {
      const r = await Promise.race([
        tx.wait(),
        new Promise((_, rej) => setTimeout(
          () => rej(new Error('_AGG_TIMEOUT')),
          waitMs)),
      ]);
      const costPls = (Number(_gasCost(r)) / 1e18).toFixed(4);
      console.log(
        '[rebalance] swap (aggregator): confirmed %s -> %s'
          + ' gasUsed=%s cost=%s PLS',
        fromSym, toSym,
        String(r.gasUsed), costPls);
      return { txHash: r.hash, gasCostWei: _gasCost(r) };
    } catch (err) {
      if (err.message !== '_AGG_TIMEOUT'
        && err.code !== 'CALL_EXCEPTION') throw err;
      await _handleSwapError(
        err, signer, provider, tx.nonce,
        waitMs, fromSym, toSym);
      if (attempt < maxAttempts) {
        quote = await _fetchQuote(
          tokenIn, tokenOut, amountIn,
          slippagePct);
        console.log(
          '[rebalance] swap (aggregator): re-quoted'
            + ' %s -> %s buy=%s',
          fromSym, toSym, quote.buyAmount);
      }
    }
  }
  throw new Error(
    'Aggregator swap failed after ' + maxAttempts + ' attempts');
}

/**
 * Swap via 9mm DEX Aggregator (primary path — lowest slippage).
 * Fetches a quote, approves, re-quotes, then submits with
 * cancel-and-requote retry on timeout.
 * @param {object} signer     ethers Signer.
 * @param {object} ethersLib  ethers library.
 * @param {object} params     Swap parameters.
 * @param {function} balanceDiff  Balance-diff wrapper.
 * @returns {Promise<{amountOut: bigint, txHash: string|null, gasCostWei: bigint}>}
 */
async function swapViaAggregator(signer, ethersLib, params, balanceDiff) {
  const {
    tokenIn, tokenOut, amountIn, slippagePct, recipient,
    symbolIn, symbolOut,
  } = params;
  const symIn = symbolIn || tokenIn.slice(0, 10);
  const symOut = symbolOut || tokenOut.slice(0, 10);
  const signerAddr = await signer.getAddress();
  const quote = await _fetchQuote(
    tokenIn, tokenOut, amountIn, slippagePct);
  const impact = parseFloat(quote.estimatedPriceImpact) || 0;
  const slip = slippagePct ?? 0.5;
  const sources = (quote.sources || [])
    .filter((s) => s.proportion !== '0')
    .map((s) => s.name).join(', ') || 'unknown';
  console.log(
    '[rebalance] swap (aggregator): %s -> %s'
      + ' quote buy=%s guaranteed=%s impact=%s%% sources=%s',
    symIn, symOut,
    quote.buyAmount, quote.guaranteedPrice || '—',
    impact.toFixed(2), sources);
  _checkSwapImpact(impact, slip);
  const tokenC = new ethersLib.Contract(tokenIn, ERC20_ABI, signer);
  await _ensureAllowance(tokenC, signerAddr,
    quote.allowanceTarget, amountIn);
  const fresh = await _fetchQuote(
    tokenIn, tokenOut, amountIn, slippagePct);
  if (fresh.allowanceTarget !== quote.allowanceTarget)
    await _ensureAllowance(tokenC, signerAddr,
      fresh.allowanceTarget, amountIn);
  const provider = signer.provider || signer;
  return balanceDiff(ethersLib, tokenOut,
    recipient, provider, async () => {
    return _sendWithRetry(
      signer, provider, fresh, slippagePct,
      tokenIn, tokenOut, amountIn,
      symIn, symOut);
  });
}

module.exports = { swapViaAggregator };
