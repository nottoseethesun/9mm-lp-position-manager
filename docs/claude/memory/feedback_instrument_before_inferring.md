---
name: feedback_instrument_before_inferring
description: When a UI bug's trigger isn't reproducible from reading code, add logging and get real values — do not ship a model inferred from the source
metadata:
  type: feedback
---

# Instrument before inferring

When a reported bug's trigger cannot be reproduced from reading the
code, stop building fixes. Add logging, have the user reproduce, and fix
from the values. Reading harder is not verification.

**Why:** On 2026-08-05, Pool Details falsely warned that a token's
decimals "couldn't be read on-chain". I shipped three fixes in a row,
each built on a model derived by reading source, and each wrong:

1. Gated on sync completion — wrong premise. I had asserted a managed
   position mid-sync has no `poolState`; it does, published every poll.
2. Gated on "has a reading arrived" and disabled the form permanently
   for unmanaged positions — wrong, they do get a reading, from the
   detail fetch.
3. Read decimals from both sources — closer, but still the wrong
   question.

The user reproduced it on the first try after fix 3 and then said what
none of the code reading had: for unmanaged positions the form should
not exist at all, because its only correction is a historical one and an
unmanaged position has no recorded history to correct.

Each round I "verified" by re-reading my own reasoning, and wrote tests
from the same assumptions — so they confirmed my model rather than
reality. The user's verdict: "you are working in a very confused
fashion", then a full reset to the last release, discarding all of it.

**How to apply:**

- Two wrong models on the same bug is the signal. At that point add a
  diagnostic line printing every input the decision uses, ask the user
  to reproduce, and wait for the values. Do not attempt a third fix.
- Prefer permanent diagnostics over temporary ones here — this codebase
  already keeps step-by-step rebalance logs for the same reason.
- A test written from the same assumption as the fix proves nothing.
  Test the seam with the REAL collaborators, or the two halves agree
  with each other while the feature stays broken.
- When the user states an invariant ("the app has one Synced state"),
  check whether the code actually implements it before building on it.
  Here it did not, and that gap was the bug.
- Related: [[feedback_verify_runtime_before_rediagnosing]] (verify the
  runtime, not the source), [[feedback_basic_fix_first]].
