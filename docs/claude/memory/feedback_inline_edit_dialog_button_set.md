---
name: feedback-inline-edit-dialog-button-set
description: "Inline-edit dialogs get a three-button set (Save, Return to Automatic <thing>, Cancel) with distinct roles. Cancel exists purely as a visual-collapse affordance; no double-duty allowed."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

Every inline-edit dialog with an editable field that overrides an auto-detected value should have the same three buttons, in the same order:

1. **Save** — persist the typed value as the manual override.
2. **Return to Automatic &lt;thing&gt; Detection** — clear the override outright; auto-detection resumes.
3. **Cancel** — close the dialog with no other side effects.

**Why:** The user's principle: "A cancel button exists only to give the user reassurance, and to visually collapse the in-line edit dialog." Making Cancel do anything else (e.g., act as revert) muddles that. Users already know an empty-then-Save reverts, so **Return to Automatic Detection** is the explicit affordance for that intent — no need to make Cancel do it too. Three buttons that each have exactly one job read cleanly and remove ambiguity.

**How to apply:** When adding or auditing an inline-edit dialog:
- Verify all three buttons are present, in the Save / Return to Automatic / Cancel order.
- Cancel closes the dialog. Do not add any other side effect (no clearing, no reset, no save).
- Return-to-Automatic button clears both localStorage and the server-side override (POST the "cleared" sentinel — typically `null` or `0`), refreshes the label, and closes the dialog.
- The circle-`i` popover for the field should describe each button explicitly under a "Buttons on the edit dialog" section.

Applies to (at minimum): `initialDepositInputWrap`, `lifetimeDaysInputWrap`. Establish the same pattern for any future inline-edit dialog.
