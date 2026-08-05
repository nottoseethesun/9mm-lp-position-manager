---
name: feedback-trace-semantic-coherence
description: "When a fix picks a display convention (sentinel, cap, magic number), trace the value end-to-end — display, save, persisted config, bot behavior. Divergence = user has to find it."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

When a fix adopts a display convention or sentinel value (e.g., "show 100 for full range"), verify the same value has the same meaning through **display → Save handler → persisted config → bot rebalance/behavior logic**. If saving the displayed value produces different behavior than the display implies, the fix is incoherent and the user will find it.

**Why:** On the range-width full-range bug (2026-07-17), I fixed the display to show `100.00` for full-range positions but shipped it without noticing three obvious semantic mismatches:
1. Saving 100 to config would mint a ±100% concentrated position, not full-range.
2. The input's `max="200"` was aerobatics for edge-case asymmetric offsets — `100` is the physical limit for the common symmetric case.
3. `_clampFloat(v, 0.1, 200)` in defaults matched (2), so the whole stack agreed on a number the UI would never sensibly show.

User had to push through three rounds — "does this still rebalance properly?", "why does 100 = ±50%?", "why is max=200?" — to get me to trace the semantics end-to-end. That's the common sense they were asking for.

**How to apply:** Before shipping a display-only fix that adopts a sentinel or convention, ask:
- If the user Saves this value, does the bot do what the display implies?
- Are there validators / clamps / defaults / bot code paths that interpret this value differently?
- Does the input's `min` / `max` / `step` reflect the same convention?

If any answer is no, either extend the convention through the whole stack in one PR, or don't adopt the display convention in the first place. Don't ship half a fix.

Related: [[feedback-finish-logic]], [[feedback-think-ahead]].
