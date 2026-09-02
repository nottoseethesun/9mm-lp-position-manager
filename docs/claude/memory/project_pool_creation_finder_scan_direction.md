---
name: Pool-creation Factory scan direction
description: Nice-to-have — findPoolCreationBlock walks Factory PoolCreated chunks oldest→newest; reversing makes brand-new pools resolve in the first chunk
type: project
originSessionId: ca6cd238-0010-4f82-88ce-354f7a7bc54e
---
`src/pool-creation-finder.js` `findPoolCreationBlock` walks the V3
Factory's `PoolCreated` event log in 50k-block chunks from oldest to
newest. For a pool created today inside a 5-year scan window, that
traverses ~150 chunks of empty history before finding the creation
event in the most recent chunk.

Since the cached-resolver fix (commit `c57339f`, branch
`fix-event-scanner-pool-creation-cache-bypass`), this cost is paid at
most **once per pool ever** — `getPoolCreationBlockCached` memoises the
result in-process and persists it to disk. So this is purely a
cold-cache, first-encounter optimisation.

**Why:** Surfaced 2026-05-02 on a freshly-created TEXAN/eTexan pool. The
primary bug (wallet LP scans re-walking the Factory every time) is
fixed; this remaining inefficiency only hurts the very first lookup.

**How to apply:** When/if it becomes worth fixing — reverse the loop in
`findPoolCreationBlock` (iterate from `toBlock` down to `fromBlock` in
chunks, returning the first match). Newly-created pools resolve in one
chunk; old pools fall back to roughly the same cost as today. The
primitive is small (~50 lines) and well-tested in
`test/pool-creation-finder.test.js` so the refactor is contained.

---

**On the public list (2026-09-02).** Published on the README's
Nice-to-Have list as "Reverse the Pool-Creation Block Scan", detailed in
`docs/roadmap/nice-to-haves/project_pool_creation_scan_direction.md`.
Keep the two in step, and do not add a second entry for it.
