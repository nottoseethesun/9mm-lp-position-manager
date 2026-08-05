---
name: feedback_no_internal_constants_in_design_talk
description: "In design/plan talk, describe operator-facing behavior — not internal implementation constants"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 78a8529a-26ef-44db-9111-a84bd3dec37f
---

When discussing a design or plan with the user, describe the operator-facing BEHAVIOR, not internal implementation constants (validation ranges, thresholds, magic numbers).

**Why:** surfacing an internal constant invites confusion and tangents without adding value. Concrete instance (2026-07-31): I mentioned the `[0,77]` ERC-20 decimals *validation* range while explaining the decimals heal; the user read it as a possible *fallback-value* strategy and we spent two turns clearing it up. The range was never operator-relevant.

**How to apply:** say "the heal uses a valid decimals value (on-chain or your manual entry), or it auto-stops — it never guesses" instead of naming the `[0,77]` check. Only surface an internal constant if it changes what the operator sees or must decide. Related: [[feedback_concise_responses]], [[feedback_kiss]], [[feedback_short_sentences]].
