---
name: dont-modify-tested-code-before-commit
description: "When the user tests code and asks to commit + push, do NOT modify the code before committing — not even to strip debug logging that looks like development junk. The commit must match what was verified."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

If the user has tested code and given `commit and push` instructions, the commit must contain what they tested — byte-for-byte on the behavioral logic.  Do NOT strip "development-looking" additions (debug logs, temporary comments, quick-and-dirty conditionals) between their green-light and the commit unless you have explicitly asked and they have explicitly agreed.

**Why:** In the 0.8.8 session, the user said "it's working properly now — write me up the release notes" then "commit and push."  Between those instructions I quietly stripped the tick-level debug logging from `_waitForReloadCompletion` because it "looked like debug junk", rebuilt, and committed.  The commit `423e1cb` did NOT contain the code the user had tested.  We had to `--amend` twice to put the logs back.  Trust cost: significant.  Time cost: their time (which was already burned by three prior bad attempts).

**How to apply:**
- Tested code + `commit` instruction → commit exactly what was tested.  Nothing more, nothing less.
- If I think something in the tested code should not ship (debug logs, a temporary path), ASK.  "Want me to strip the tick logs before committing?"  Wait for the yes.
- Default posture: match the tested working code exactly.  Polish is a separate turn.

Adjacent rule ([[feedback_wait_after_asking]]): if I ask a question and offer numbered options, wait for the answer before acting.
