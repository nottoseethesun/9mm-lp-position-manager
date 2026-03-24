/**
 * @file test/native-unwrapper.test.js
 * @description Tests for the generic wrapped-native-token utility.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getChainConfig, isWrappedNative, unwrapNative, wrapNative } = require('../src/native-unwrapper');

describe('native-unwrapper', () => {
  describe('getChainConfig', () => {
    it('returns PulseChain config', () => {
      const cfg = getChainConfig('pulsechain');
      assert.ok(cfg);
      assert.equal(cfg.chainId, 369);
      assert.equal(cfg.wrappedNativeToken, '0xA1077a294dDE1B09bB078844df40758a5D0f9a27');
      assert.equal(cfg.nativeCurrency.symbol, 'PLS');
    });

    it('returns null for unknown chain', () => {
      assert.equal(getChainConfig('solana'), null);
    });
  });

  describe('isWrappedNative', () => {
    const cfg = getChainConfig('pulsechain');

    it('matches wPLS address (case-insensitive)', () => {
      assert.ok(isWrappedNative('0xA1077a294dDE1B09bB078844df40758a5D0f9a27', cfg));
      assert.ok(isWrappedNative('0xa1077a294dde1b09bb078844df40758a5d0f9a27', cfg));
    });

    it('rejects non-wPLS address', () => {
      assert.equal(isWrappedNative('0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', cfg), false);
    });

    it('handles null/undefined safely', () => {
      assert.equal(isWrappedNative(null, cfg), false);
      assert.equal(isWrappedNative('0xA1077a294dDE1B09bB078844df40758a5D0f9a27', null), false);
      assert.equal(isWrappedNative(undefined, undefined), false);
    });
  });

  describe('unwrapNative', () => {
    it('skips unwrap for zero amount', async () => {
      const result = await unwrapNative({}, {}, { wrappedAddress: '0xtest', amount: 0n });
      assert.equal(result.txHash, null);
    });

    it('calls withdraw on the wrapped contract', async () => {
      let withdrawCalled = false;
      let withdrawAmount;
      const mockEthers = {
        Contract: class {
          withdraw(amt) {
            withdrawCalled = true;
            withdrawAmount = amt;
            return { wait: () => Promise.resolve({ gasUsed: 21000n, blockNumber: 100, hash: '0xabc' }) };
          }
        },
      };
      const result = await unwrapNative({}, mockEthers, { wrappedAddress: '0xtest', amount: 1000n });
      assert.ok(withdrawCalled);
      assert.equal(withdrawAmount, 1000n);
      assert.equal(result.txHash, '0xabc');
    });

    it('uses waitFn when provided', async () => {
      let waitFnCalled = false;
      const mockTx = { hash: '0xdef' };
      const mockEthers = {
        Contract: class {
          withdraw() { return mockTx; }
        },
      };
      const waitFn = () => { waitFnCalled = true; return { gasUsed: 100n, blockNumber: 1, hash: '0xdef' }; };
      const result = await unwrapNative({}, mockEthers, { wrappedAddress: '0xtest', amount: 500n, waitFn });
      assert.ok(waitFnCalled);
      assert.equal(result.txHash, '0xdef');
    });
  });

  describe('wrapNative', () => {
    it('skips wrap for zero amount', async () => {
      const result = await wrapNative({}, {}, { wrappedAddress: '0xtest', amount: 0n });
      assert.equal(result.txHash, null);
    });

    it('calls deposit with value', async () => {
      let depositCalled = false;
      let depositValue;
      const mockEthers = {
        Contract: class {
          deposit(opts) {
            depositCalled = true;
            depositValue = opts.value;
            return { wait: () => Promise.resolve({ gasUsed: 21000n, blockNumber: 200, hash: '0x123' }) };
          }
        },
      };
      const result = await wrapNative({}, mockEthers, { wrappedAddress: '0xtest', amount: 2000n });
      assert.ok(depositCalled);
      assert.equal(depositValue, 2000n);
      assert.equal(result.txHash, '0x123');
    });
  });
});
