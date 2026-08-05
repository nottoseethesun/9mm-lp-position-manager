---
name: Hardening / burn-in mode means strictly minimal scope
description: When the user signals production hardening or burn-in, do not refactor or restyle anything beyond the exact target of the request
type: feedback
originSessionId: 814e1275-4ff7-43e4-99ce-426a2df5a055
---
When the user says we're "hardening a production release," running burn-in, or otherwise stabilizing for soft-launch, **keep every change strictly inside the requested boundary**.  If the request names a single modal/component/file, do not touch its neighbours — even for parsimony's sake, even for consistency, even if a nearby element clearly follows an older pattern.

**Why:** Each new touch surface is another place for a regression to appear during burn-in and reset the soft-launch clock.  On 2026-05-13, while restyling the Pool Details modal alone (PR #128), the user said three times in a row: "Limit the change to just this modal dialog.  Don't go wild throughout the app.  We are hardening a production release." — making it clear that pattern-propagation work (introducing `<section>` semantics, restructuring siblings, etc.) is unwelcome during this phase.

**How to apply:**

- If the user names a target (a modal, a button, a card, a specific file), edit *only* that target's markup/JS/CSS — even if neighbouring elements share the same anti-pattern.
- Do not "improve consistency" across unrelated parts of the app.  No incidental refactors, no renames, no helper extractions outside the named target.
- Audit `git diff --stat main` after each change in hardening mode and confirm the file list matches the named scope.  If it expanded, undo the spread.
- When the user invokes hardening / burn-in / production-release language, treat it as a hard scope lock that lasts until they explicitly green-light larger work again.
