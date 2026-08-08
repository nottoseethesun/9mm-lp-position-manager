---
name: project_0817_burn_in_watch
description: "Release 0.8.17 (2026-08-08) entered Prod burn-in. The item to watch is the aggregator chain-slug fix: swaps should now route via the 9mm Aggregator instead of silently falling back to the V3 SwapRouter."
metadata: 
  node_type: memory
  type: project
  originSessionId: fbb9ad2b-bfb6-4113-a2f4-fcb15a7900da
  modified: 2026-08-08T19:08:05.248Z
---

Release **0.8.17** cut 2026-08-08 and installed on Prod the same day.
<https://github.com/nottoseethesun/lp-ranger/releases/tag/0.8.17>

## The one to watch: aggregator routing

`c77d09f` added the chain slug the 9mm swap API requires
(`api.9mm.pro/pulsechain/swap/v1/quote`, not `api.9mm.pro/swap/v1/quote`).
Verified against the live API: 404 without it, 200 with it.

**Why it matters in burn-in:** a failed aggregator quote falls through the
chain to the V3 SwapRouter, so swaps completed either way — on the worse
route, with no alarm. This is the first release where rebalance swaps
actually reach the aggregator's multi-hop routing, so **swap pricing and
slippage behaviour on Prod change with this release** even though nothing
about the rebalance logic changed.

**Verification signal:** after the next rebalance, the routing badge /
"Routed Via" should report **9mm Aggregator** rather than the V3 router.
If it still shows the router, the log now says why — `_aggregatorBase()`
throws a named error rather than silently rebuilding a 404 URL.

**Open question this release cannot answer:** whether 9mm's API always
rejected the slug-less path, or only began requiring the segment recently.
The slug was never in the repo (`git log --all -S'pulsechain/swap'` is
empty), so the code depended on an undocumented path shape from the day
the aggregator shipped (2026-03-31). If quote failures reappear, suspect
the vendor path shape first.

## Behaviour changes worth a second look

- **Pool Details** lost its bottom `OK`; the top-right Close is the only
  dismiss now.
- **Clear Local Storage** copy now warns that the wallet and any API keys
  must be re-entered. Scoped to browser re-entry (cookies carry the
  session; localStorage holds only position/UI state) — if that framing is
  wrong in practice, that is the line to correct.
- **Escape** now closes the topmost layer first across every dialog, not
  just the new ones.

Cross-links: [[feedback_burn_in_probe]] — ask "anything felt off, even
small?" while this is running. [[project_maturity_staircase]].
