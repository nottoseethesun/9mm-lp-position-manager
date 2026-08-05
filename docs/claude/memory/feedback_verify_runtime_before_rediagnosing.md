---
name: verify-runtime-before-rediagnosing
description: "When the user reports 'still broken' on a change that is green in tests: FIRST verify what their runtime is actually executing (bundle stamp vs build, server restarted?, branch checked out?) BEFORE touching the logic again. Never layer new code on an unconfirmed diagnosis."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

On 2026-07-23 a one-line UI fix spiraled: the fix was correct and
green in tests, but the user's browser was executing a stale
immutable-cached bundle (because I kept reverting the cache-bust
stamps).  I mis-read each "still broken" report as a logic bug and
added MORE code (server-side emit, client seed) under wrong
diagnoses.  The user called it "hazardous to my app code" — correct.

**Hard rules:**

1. Before reporting a user-facing fix as done, verify it through the
   REAL serving path, not only unit tests: for this app that means
   `npm run build` ran, the `?v=` stamp in the COMMITTED index.html
   moved, and the user knows a reload is needed.  Related:
   [[feedback_never_revert_cache_bust_stamps]],
   [[feedback_use_the_path_being_tested]].
2. When the user reports "still broken" and the source + tests are
   verifiably correct: the FIRST check is runtime-vs-source, in this
   order — (a) committed stamp vs latest build stamp, (b) which
   branch/commit the running server's working tree is on, (c) was the
   server restarted since the change, (d) live-inspect the running
   system (curl /api/status) — BEFORE re-opening the logic.
3. Never add a second fix while the first is unconfirmed-delivered.
   One diagnosis, one change, one verified delivery, then reassess.
4. Every extra fix layered under a wrong diagnosis is real code the
   user must now carry.  When a wrong-diagnosis layer is discovered,
   explicitly re-justify it on its own merits or propose removing it.
