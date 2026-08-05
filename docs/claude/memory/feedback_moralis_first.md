---
name: feedback_moralis_first
description: Use Moralis API as primary historical price source when API key is available — GeckoTerminal rate limits make iteration too slow
type: feedback
---

When the user has a Moralis API key configured, always use Moralis as the primary historical price source (not just a fallback). GeckoTerminal's rate limits (30 calls/min, 45s+ waits) make full epoch reconstruction painfully slow during development/testing iteration.
**Why:** Each test run with 77 epochs can take 4+ minutes just waiting on GeckoTerminal rate limits. Moralis has no such limits with an API key.
**How to apply:** In `fetchHistoricalPriceGecko`, check for Moralis key first. If available + blockNumber known, try Moralis before GeckoTerminal. Fall back to GeckoTerminal only for Moralis misses.
