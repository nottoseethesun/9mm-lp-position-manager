---
name: tests-cover-full-contract-before-manual
description: "Before asking the user to manually test, the automated tests must cover the FULL user-visible contract — including every adjacent display/consumer of the changed state and the timing assumptions the fix relies on. Manual testing is confirmation, not discovery."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

On 2026-07-23 the user asked: "How come you are just now writing
tests for a feature I thought you had already written tests for?  You
shouldn't have me doing manual testing when the automated tests are
not done."

What happened: every commit shipped with tests, but (a) one test
pinned a FALSE timing assumption (the one-shot poll-skip test assumed
the second sweep carries fresh server data; the audit proved the
stale window spans up to CHECK_INTERVAL_SEC), and (b) adjacent
consumers of the same state (the countdown KPI, string-typed config
values) had no assertions.  Green tests + incomplete contract =
the user's manual session became the bug-discovery mechanism, three
times.

**How to apply:**
- Before requesting manual verification, enumerate every user-visible
  surface that reads the changed state (grep consumers) and assert
  each one.  A fix to a shared value (e.g. `throttle.minIntervalMs`)
  is not covered until every derived display is covered.
- Timing/ordering assumptions in a fix (poll cadences, snapshot
  freshness, event ordering) must be stated in the test docstring AND
  verified against the code path — a test that encodes an unverified
  assumption is a fake pass ([[feedback_finish_logic]],
  no-fake-tests audit).
- Manual testing requests should say exactly what the automated tests
  already prove and what the manual pass is confirming on top.
