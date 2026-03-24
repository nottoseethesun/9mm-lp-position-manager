/**
 * @file native-unwrapper.js
 * @description Generic utility for detecting and converting between wrapped
 *   and raw native tokens on any EVM chain (wPLS↔PLS, WETH↔ETH, etc.).
 *
 *   V3 positions output the wrapped native token on withdrawal but require
 *   the raw native token (sent as `msg.value`) for deposits.  This module
 *   bridges that asymmetry.
 *
 *   Supported chains are defined in `chains.json` — the single source of
 *   truth for blockchain configuration.
 */

'use strict';

const chains = require('./chains.json');

/** Minimal WETH9-compatible ABI (deposit + withdraw + ERC20 subset). */
const WETH9_ABI = [
  'function deposit() external payable',
  'function withdraw(uint256 wad) external',
  'function balanceOf(address) view returns (uint256)',
];

/**
 * Load chain configuration by name.
 * @param {string} chainName  e.g. 'pulsechain'
 * @returns {object|null}
 */
function getChainConfig(chainName) {
  return chains[chainName] || null;
}

/**
 * Check if a token address is the chain's wrapped native token.
 * @param {string} tokenAddress
 * @param {object} chainCfg  from getChainConfig()
 * @returns {boolean}
 */
function isWrappedNative(tokenAddress, chainCfg) {
  if (!tokenAddress || !chainCfg?.wrappedNativeToken) return false;
  return tokenAddress.toLowerCase() === chainCfg.wrappedNativeToken.toLowerCase();
}

/**
 * Unwrap wrapped native tokens → raw native (e.g. wPLS → PLS).
 * Calls `withdraw(amount)` on the WETH9/wPLS contract.
 *
 * @param {object} signer     ethers Signer
 * @param {object} ethersLib  ethers library (for Contract)
 * @param {object} opts
 * @param {string} opts.wrappedAddress  WETH9/wPLS contract address
 * @param {bigint} opts.amount          amount to unwrap (wei)
 * @returns {Promise<{txHash: string}>}
 */
async function unwrapNative(signer, ethersLib, { wrappedAddress, amount, waitFn }) {
  if (!amount || amount <= 0n) return { txHash: null };
  const { Contract } = ethersLib;
  const wrapped = new Contract(wrappedAddress, WETH9_ABI, signer);
  console.log('[native] Unwrapping %s wrapped native → raw native', String(amount));
  const tx = await wrapped.withdraw(amount);
  const receipt = waitFn ? await waitFn(tx, signer, 'unwrap') : await tx.wait();
  console.log('[native] Unwrap confirmed: gasUsed=%s block=%s', String(receipt.gasUsed), receipt.blockNumber);
  return { txHash: receipt.hash };
}

/**
 * Wrap raw native tokens → wrapped native (e.g. PLS → wPLS).
 * Calls `deposit()` on the WETH9/wPLS contract with `msg.value`.
 *
 * @param {object} signer     ethers Signer
 * @param {object} ethersLib  ethers library (for Contract)
 * @param {object} opts
 * @param {string} opts.wrappedAddress  WETH9/wPLS contract address
 * @param {bigint} opts.amount          amount to wrap (wei)
 * @returns {Promise<{txHash: string}>}
 */
async function wrapNative(signer, ethersLib, { wrappedAddress, amount, waitFn }) {
  if (!amount || amount <= 0n) return { txHash: null };
  const { Contract } = ethersLib;
  const wrapped = new Contract(wrappedAddress, WETH9_ABI, signer);
  console.log('[native] Wrapping %s raw native → wrapped native', String(amount));
  const tx = await wrapped.deposit({ value: amount });
  const receipt = waitFn ? await waitFn(tx, signer, 'wrap') : await tx.wait();
  console.log('[native] Wrap confirmed: gasUsed=%s block=%s', String(receipt.gasUsed), receipt.blockNumber);
  return { txHash: receipt.hash };
}

module.exports = { getChainConfig, isWrappedNative, unwrapNative, wrapNative, WETH9_ABI };
