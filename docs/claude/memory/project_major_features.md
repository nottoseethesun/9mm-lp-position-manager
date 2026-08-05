---
name: Major Features to Consider Implementing
description: Platform-scale features queued for post-soft-launch consideration; distinct from the smaller nice-to-haves list
type: project
originSessionId: ca6cd238-0010-4f82-88ce-354f7a7bc54e
---
A separate, higher-tier list from the nice-to-haves. These are
platform-scale or strategic features, not incremental polish.

Created 2026-04-29 during burn-in for release 0.6.5.

## Current items

1. **Multi-chain support** — add 9mm on Ethereum first, then the
   other blockchains 9mm supports. Already documented in README Road
   Map.

2. **LP Optimization Engine** — integrate with an external
   optimization service that recommends optimal range width,
   rebalance timing, and fee tier based on historical pool data and
   volatility analysis. Already documented in README Road Map.

3. **X1 (Solana-fork) port** — port LP Ranger to X1, the Solana fork.
   Layered transfer plan + 5 blocker questions captured in
   `project_x1_transfer_plan.md`. Originally on the nice-to-haves
   list; relocated here 2026-04-29 as platform-port-scale work.

**Why:** User wanted these tracked separately from the incremental
nice-to-haves so the strategic roadmap is visible without scrolling
through small polish items.

**How to apply:**
- All deferred until **after** soft-launch (per
  `project_burn_in_release.md`).
- Do NOT propose implementation work on these unless the user
  explicitly picks one up.
- When the user references "the big features" or asks about
  long-term direction, this is the relevant list.
- New strategic/platform-scale items added in future sessions
  belong here, not on the nice-to-haves list.
