---
name: feedback_prove_the_revert_applied
description: "When proving a new test catches the bug it was written for, assert that the revert patch actually applied. A silently-failed edit reports green and looks like proof."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 69776dd5-edb5-451f-b253-a207133d6169
  modified: 2026-09-02T07:47:40.717Z
---

The habit of confirming a regression test by reverting the fix and
watching it go red is only worth anything if the revert **actually
landed**. A string-replace that matches nothing changes no file, the
suite passes, and that passing run looks exactly like "the test does not
catch it" — or worse, gets misread as "verified."

This happened on `needsEntryFromChain` (2026-09-02): the replacement
text was written before `npm run format` re-indented the continuation
lines, so the pattern no longer matched. The revert was a no-op, the
tests passed, and the next step would have been to report the test as
proven when nothing had been tested.

**How to apply:**

- Put an `assert`/`raise` on every patch used for verification —
  `assert old in s, "PATCH DID NOT MATCH"` — so a missed match is loud.
- Prefer index-based slicing (`s.index(start) … s.index(end)`) over
  matching a long literal block, since Prettier reflows whitespace and
  line breaks inside a block after you have copied it.
- Confirm the mutation independently before running the suite: a
  `grep -c` for the removed token, or a diff line count.
- A verification run that comes back green is a result to be suspicious
  of, not a result to report.

Related: [[feedback_instrument_before_inferring]],
[[feedback_use_the_path_being_tested]].
