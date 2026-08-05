---
name: Swap calls must stay fully serialized
description: Architectural decision — swap path uses totally-serialized/defensive calls to avoid RPC acceptance issues; do not "optimize" with parallelism
type: project
---

Swap calls (and surrounding TX flow in the rebalancer) are intentionally fully serialized / defensive. This was the headline bugfix shipped in 0.4.4 (2026-04-19).

**Why:** Parallel or loosely-ordered swap calls hit RPC acceptance issues on PulseChain — pending TX state, nonce contention, or provider-side rejection caused inconsistent behavior. A totally-serialized approach avoids these issues deterministically, even at the cost of throughput.

**How to apply:** Do NOT suggest parallelizing swap/approve/mint calls, batching TX submission, or using `Promise.all` across on-chain writes as a performance improvement. If touching `src/rebalancer*.js`, `src/rebalancer-swap.js`, or `src/rebalancer-aggregator.js`, preserve await-by-await ordering. Multicall is fine (that's a single TX); what's forbidden is sending multiple TXs in flight. Check `src/rebalance-lock.js` to confirm the mutex-based serialization is still intact before proposing changes nearby.
