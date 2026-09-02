# Reverse the Pool-Creation Block Scan

> **Status:** Nice-to-have / performance &mdash; not a bug. The result is
> correct either way, and the cost is paid at most once per pool. Funds
> are never at risk.

## Plain language

To find out when a pool was created, the app scans the exchange's factory
records forward from five years ago. For a pool created last week that
means walking through years of empty history before reaching the one
recent record that matters.

## Detail

`findPoolCreationBlock` reads the factory's `PoolCreated` log in
50,000-block chunks, oldest first. On a five-year window that is roughly
150 chunks, nearly all of them empty, for a pool created today.

Since the cached-resolver fix the answer is memoised in process and
persisted to disk, so this is paid **once per pool, ever**. It is purely
a cold-cache, first-encounter cost &mdash; noticeable when adding a
brand-new pool, invisible afterwards.

## Fix when prioritized

Reverse the loop: iterate from the newest block downward and return the
first match. Newly created pools then resolve in a single chunk, while
long-lived pools cost about what they do today. The primitive is small
and already covered by `test/pool-creation-finder.test.js`, so the change
is contained.
