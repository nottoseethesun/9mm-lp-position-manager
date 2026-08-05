---
name: project_util_coverage_deferred
description: Deferred (2026-08-04) — four util/diagnostic tools sit at 60-77% coverage because each main() builds a live provider; needs main() decomposed
metadata: 
  node_type: memory
  type: project
  originSessionId: 8264efa3-921c-4733-b040-c9845e2b3a5e
  modified: 2026-08-05T00:43:40.360Z
---

Deferred 2026-08-04 to stay focused on the inflated-compound investigation.
Committed in a8c85ff; `npm run check` is green, so this is polish, not a bug.

`util/diagnostic/test/` now runs under plain `npm test` and `npm run check`
and counts toward the 80% coverage floor. Four tools still sit below it:

- `reconcile-hodl.js` 60.0% — `main()` is 165 of ~470 lines
- `wallet-token-flow.js` 65.7% — `main()` is ~111 lines
- `rescan-pool-history.js` 74.3%
- `show-rebalance-chain.js` 77.5%
- `verify-compound-usd/index.js` 77.2%

**Why:** Each `main()` constructs a live `JsonRpcProvider`, so it can't be
driven without the network. For `reconcile-hodl` 80% is arithmetically
unreachable without splitting it.

**How to apply:** Extract each `main()`'s report-rendering half into a
function taking already-computed data, exactly as
`util/diagnostic/verify-compound-usd/render.js` does — that split took its
index.js from 48% to 77% with render.js at 98%. Test by capturing console
output with `util/diagnostic/test/_capture.js` (`captureConsole`,
`captureExit`, `fakeProvider`). Also still open: `util/cache/clean-pool-cache.js`
has 9 lines over 80 columns (the `util/diagnostic` 80-col sweep did not cover
`util/cache`). See [[feedback_util_subdir_per_utility]] and
[[feedback_never_compact_code]] — extract, never compact.
