'use strict';
/**
 * Shared mock setup for rebalancer test suites.
 *
 * Provides addresses, helpers, mock signer/dispatch/ethersLib builders
 * used by both rebalancer.test.js and rebalancer-mint.test.js.
 */

const ADDR = {
  factory: '0xFACTORY0000000000000000000000000000000001',
  pool: '0xPOOL00000000000000000000000000000000000001',
  token0: '0xTOKEN00000000000000000000000000000000000A',
  token1: '0xTOKEN00000000000000000000000000000000000B',
  pm: '0xPM000000000000000000000000000000000000001',
  router: '0xROUTER0000000000000000000000000000000001',
  signer: '0xSIGNER0000000000000000000000000000000001',
};
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const Q96 = BigInt('0x1000000000000000000000000');
const ONE_ETH = 1_000_000_000_000_000_000n;

const INC_TOPIC =
  '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f';

function makeTx(hash) {
  return { wait: async () => ({ hash, logs: [] }) };
}

/** Make a mint tx that includes a valid IncreaseLiquidity event. */
function makeMintTx(
  hash,
  tokenId = 42n,
  liquidity = 5000n,
  amount0 = 1000n,
  amount1 = 1000n,
) {
  return {
    wait: async () => ({
      hash,
      logs: [
        {
          topics: [
            INC_TOPIC,
            '0x' + tokenId.toString(16).padStart(64, '0'),
          ],
          data:
            '0x' +
            liquidity.toString(16).padStart(64, '0') +
            amount0.toString(16).padStart(64, '0') +
            amount1.toString(16).padStart(64, '0'),
        },
      ],
    }),
  };
}

function mockSigner(address) {
  return {
    getAddress: async () => address ?? ADDR.signer,
    provider: { mockProvider: true },
  };
}

/**
 * Default mock dispatch. The balanceOf for tokens returns different values
 * before and after collect so balance-diff works (before=0, after=5 ETH).
 */
function defaultDispatch() {
  // Track collect calls to switch balanceOf from "before" to "after"
  let collected = false;
  return {
    [ADDR.factory]: { getPool: async () => ADDR.pool },
    [ADDR.pool]: { slot0: async () => ({ sqrtPriceX96: Q96, tick: 0n }) },
    [ADDR.token0]: {
      decimals: async () => 18n,
      balanceOf: async () => (collected ? 5n * ONE_ETH : 0n),
      approve: async () => makeTx('0xapprove0'),
      allowance: async () => 0n,
    },
    [ADDR.token1]: {
      decimals: async () => 18n,
      balanceOf: async () => (collected ? 5n * ONE_ETH : 0n),
      approve: async () => makeTx('0xapprove1'),
      allowance: async () => 0n,
    },
    [ADDR.pm]: {
      ownerOf: async () => ADDR.signer,
      positions: async () => ({
        liquidity: 5000n,
        tokensOwed0: 0n,
        tokensOwed1: 0n,
      }),
      decreaseLiquidity: async () => makeTx('0xdecrease'),
      collect: async () => {
        collected = true;
        return { wait: async () => ({ hash: '0xcollect', logs: [] }) };
      },
      mint: async () => makeMintTx('0xmint'),
    },
    [ADDR.router]: {
      exactInputSingle: Object.assign(async () => makeTx('0xswap'), {
        staticCall: async (p) => p.amountIn,
      }),
    },
  };
}

function buildMockEthersLib(overrides = {}) {
  const contractDispatch = overrides.contractDispatch ?? defaultDispatch();
  function MockContract(addr, _abi, _signer) {
    const self = this;
    const methods = contractDispatch[addr];
    if (!methods) throw new Error(`No mock for address: ${addr}`);
    for (const [name, fn] of Object.entries(methods)) this[name] = fn;
    // Mock interface.encodeFunctionData + multicall for atomic decrease+collect
    const _pending = [];
    this.interface = {
      encodeFunctionData: (name, args) => {
        const idx = _pending.length;
        _pending.push({ method: name, args: args[0] });
        return `mock_call_${idx}`;
      },
    };
    if (!this.multicall) {
      this.multicall = async (calls) => {
        for (const ref of calls) {
          const idx = parseInt(ref.replace('mock_call_', ''), 10);
          const { method, args } = _pending[idx];
          if (self[method]) await self[method](args);
        }
        return makeTx('0xmulticall');
      };
    }
  }
  return {
    Contract: MockContract,
    ZeroAddress: ZERO_ADDRESS,
    ...(overrides.extra ?? {}),
  };
}

const poolArgs = {
  factoryAddress: ADDR.factory,
  token0: ADDR.token0,
  token1: ADDR.token1,
  fee: 3000,
};

module.exports = {
  ADDR,
  ZERO_ADDRESS,
  Q96,
  ONE_ETH,
  INC_TOPIC,
  makeTx,
  makeMintTx,
  mockSigner,
  defaultDispatch,
  buildMockEthersLib,
  poolArgs,
};
