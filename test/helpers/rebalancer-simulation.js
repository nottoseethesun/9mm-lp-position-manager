'use strict';

/**
 * @file test/helpers/rebalancer-simulation.js
 * @description Stateful simulation harness for rebalancer integration tests.
 * Creates mock contracts that track token balances across remove/swap/mint,
 * verifying cross-function invariants that unit tests cannot catch.
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
const INC_TOPIC =
  '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f';

/**
 * Creates a stateful mock that tracks token balances across contract calls.
 * @param {object} opts
 * @param {bigint} opts.positionAmount0  Amount of token0 in the position.
 * @param {bigint} opts.positionAmount1  Amount of token1 in the position.
 * @param {number} opts.price            Pool price (token1 per token0).
 * @param {number} opts.decimals0        Token0 decimals.
 * @param {number} opts.decimals1        Token1 decimals.
 * @param {number} opts.fee              Fee tier.
 */
function createSimulation(opts) {
  const {
    positionAmount0,
    positionAmount1,
    price,
    decimals0 = 18,
    decimals1 = 18,
    fee: _fee = 3000,
  } = opts;

  const Q96 = BigInt('0x1000000000000000000000000');
  // sqrtPriceX96 = sqrt(price * 10^(d1-d0)) * 2^96
  const adjustedPrice = price * Math.pow(10, decimals1 - decimals0);
  const sqrtPrice = Math.sqrt(adjustedPrice);
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));
  const tick = BigInt(
    Math.floor(Math.log(adjustedPrice) / Math.log(1.0001)),
  );

  // Wallet balances (start at 0, get credited on collect)
  const balances = { [ADDR.token0]: 0n, [ADDR.token1]: 0n };
  let nextTokenId = 100n;
  const invariantChecks = [];

  // Position tokens (in the NFT, not yet in wallet)
  let positionTokens = {
    amount0: positionAmount0,
    amount1: positionAmount1,
  };

  const dispatch = {
    [ADDR.factory]: { getPool: async () => ADDR.pool },
    [ADDR.pool]: { slot0: async () => ({ sqrtPriceX96, tick }) },
    [ADDR.token0]: {
      decimals: async () => BigInt(decimals0),
      balanceOf: async () => balances[ADDR.token0],
      approve: async () => ({
        wait: async () => ({ hash: '0xapprove0', logs: [] }),
      }),
      allowance: async () => 0n,
    },
    [ADDR.token1]: {
      decimals: async () => BigInt(decimals1),
      balanceOf: async () => balances[ADDR.token1],
      approve: async () => ({
        wait: async () => ({ hash: '0xapprove1', logs: [] }),
      }),
      allowance: async () => 0n,
    },
    [ADDR.pm]: {
      ownerOf: async () => ADDR.signer,
      positions: async () => ({
        liquidity: 10000n,
        tokensOwed0: 0n,
        tokensOwed1: 0n,
      }),
      decreaseLiquidity: async () => {
        // Tokens stay in PM until collect
        return { wait: async () => ({ hash: '0xdec', logs: [] }) };
      },
      collect: async () => {
        // Credit position tokens to wallet
        balances[ADDR.token0] += positionTokens.amount0;
        balances[ADDR.token1] += positionTokens.amount1;
        positionTokens = { amount0: 0n, amount1: 0n };
        invariantChecks.push({
          step: 'collect',
          bal0: balances[ADDR.token0],
          bal1: balances[ADDR.token1],
        });
        return { wait: async () => ({ hash: '0xcol', logs: [] }) };
      },
      mint: async (params) => {
        const a0 = params.amount0Desired;
        const a1 = params.amount1Desired;
        // Debit from wallet — fail if insufficient
        if (balances[ADDR.token0] < a0) {
          throw new Error(
            `Insufficient token0: have ${balances[ADDR.token0]}, need ${a0}`,
          );
        }
        if (balances[ADDR.token1] < a1) {
          throw new Error(
            `Insufficient token1: have ${balances[ADDR.token1]}, need ${a1}`,
          );
        }
        balances[ADDR.token0] -= a0;
        balances[ADDR.token1] -= a1;

        const tokenId = nextTokenId++;
        // Simulate realistic liquidity value (not just a0+a1)
        const liquidity =
          a0 > 0n && a1 > 0n
            ? BigInt(Math.floor(Math.sqrt(Number(a0) * Number(a1))))
            : a0 > a1
              ? a0
              : a1;

        invariantChecks.push({
          step: 'mint',
          a0Desired: a0,
          a1Desired: a1,
          bal0After: balances[ADDR.token0],
          bal1After: balances[ADDR.token1],
          liquidity,
        });

        return {
          wait: async () => ({
            hash: '0xmint',
            logs: [
              {
                topics: [
                  INC_TOPIC,
                  '0x' + tokenId.toString(16).padStart(64, '0'),
                ],
                data:
                  '0x' +
                  liquidity.toString(16).padStart(64, '0') +
                  a0.toString(16).padStart(64, '0') +
                  a1.toString(16).padStart(64, '0'),
              },
            ],
          }),
        };
      },
    },
    [ADDR.router]: {
      exactInputSingle: Object.assign(
        async (params) => {
          const { amountIn, tokenIn, tokenOut } = params;
          if (balances[tokenIn] < amountIn)
            throw new Error(`Swap: insufficient ${tokenIn}`);
          balances[tokenIn] -= amountIn;
          const amountOut =
            tokenIn === ADDR.token0
              ? BigInt(
                  Math.floor(
                    (Number(amountIn) / 10 ** decimals0) *
                      price *
                      10 ** decimals1,
                  ),
                )
              : BigInt(
                  Math.floor(
                    (Number(amountIn) / 10 ** decimals1 / price) *
                      10 ** decimals0,
                  ),
                );
          balances[tokenOut] += amountOut;
          invariantChecks.push({
            step: 'swap',
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            bal0: balances[ADDR.token0],
            bal1: balances[ADDR.token1],
          });
          return { wait: async () => ({ hash: '0xswap', logs: [] }) };
        },
        {
          staticCall: async (params) => {
            const { amountIn, tokenIn } = params;
            return tokenIn === ADDR.token0
              ? BigInt(
                  Math.floor(
                    (Number(amountIn) / 10 ** decimals0) *
                      price *
                      10 ** decimals1,
                  ),
                )
              : BigInt(
                  Math.floor(
                    (Number(amountIn) / 10 ** decimals1 / price) *
                      10 ** decimals0,
                  ),
                );
          },
        },
      ),
    },
  };

  function MockContract(addr, _abi, _signer) {
    const self = this;
    const methods = dispatch[addr];
    if (!methods) throw new Error(`No mock for ${addr}`);
    for (const [name, fn] of Object.entries(methods)) this[name] = fn;
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
        return { wait: async () => ({ hash: '0xmulticall', logs: [] }) };
      };
    }
  }
  const ethersLib = { Contract: MockContract, ZeroAddress: ZERO_ADDRESS };

  return { ethersLib, balances, invariantChecks };
}

function mockSigner(address) {
  return {
    getAddress: async () => address ?? ADDR.signer,
    provider: { mockProvider: true },
  };
}

function makePosition(overrides = {}) {
  return {
    tokenId: 1n,
    token0: ADDR.token0,
    token1: ADDR.token1,
    fee: 3000,
    liquidity: 5000n,
    tickLower: -600,
    tickUpper: 600,
    ...overrides,
  };
}

function makeOpts(position, extra = {}) {
  return {
    position,
    factoryAddress: ADDR.factory,
    positionManagerAddress: ADDR.pm,
    swapRouterAddress: ADDR.router,
    slippagePct: 0.5,
    ...extra,
  };
}

const ONE_ETH = 1_000_000_000_000_000_000n;

module.exports = {
  ADDR,
  createSimulation,
  mockSigner,
  makePosition,
  makeOpts,
  ONE_ETH,
};
