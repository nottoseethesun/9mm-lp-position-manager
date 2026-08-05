---
name: Price API calls should not specify pool unless necessary
description: Let the price service pick the best pool — only specify pool address on rare occasions when needed
type: feedback
---

When calling price APIs (GeckoTerminal, DexScreener), query by token address, not pool address. Let the service pick the best pool for liquidity/accuracy.

**Why:** Specifying a pool ties the price to that specific pool's liquidity, which may be thin or return bad data. The service's default pool selection is better.

**How to apply:** Use token-level endpoints (e.g., `/tokens/{address}/ohlcv/day`) instead of pool-level endpoints (e.g., `/pools/{poolAddress}/ohlcv/day`). Only use pool-specific queries when the token-level endpoint fails or returns wrong data for a specific case.
