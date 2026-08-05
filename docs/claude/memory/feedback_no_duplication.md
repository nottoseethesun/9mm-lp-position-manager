---
name: feedback_no_duplication
description: Never duplicate code or RPC calls — reuse the existing implementation; fetch once and pass the value down
metadata:
  type: feedback
---

# No duplication

Merged from: feedback_no_duplicate_code, feedback_no_duplicate_rpc.

## no duplicate code

Never duplicate code, and proactively remove duplication when you encounter it. Reuse existing functions; extract shared helpers when needed.
**Why:** User called this out when Moralis key save logic was duplicated between Settings and wallet setup ("Re-use the code in the Settings menu... never duplicate code or add duplicate implementations"). Reinforced 2026-04-30 after deduplicating `buildPollDeps` out of `bot.test.js` into the shared `_bot-loop-helpers.js` ("Always remove duplication").
**How to apply:** (1) Before writing any new function, check if the logic already exists elsewhere — extract a shared helper and import it. (2) When you spot existing duplication while working in an area, remove it as part of the change, even if the immediate task didn't require it. Don't leave duplication in place once you've seen it.

## no duplicate rpc

Never duplicate RPC calls. When multiple features need the same on-chain data, fetch once and pass to all consumers.

**Why:** RPC calls are slow, rate-limited, and costly at scale. The user flagged this as a high priority design concern when planning the lifetime HODL baseline feature (which shares IncreaseLiquidity/Collect/DecreaseLiquidity events with compound detection).

**How to apply:** Always separate data-fetching (RPC layer) from classification/business logic. Design scan functions that return raw data, then pass that data to multiple classifiers. Check existing scan functions before adding new RPC calls — the data you need may already be fetched elsewhere.
