---
name: Server events must carry their own identity, not read the viewed tab
description: For any alert/log/badge triggered by a server-reported event, derive the label from the event's own payload — never from posStore.getActive() or similar "currently viewed" globals
type: feedback
---

When fixing "this dialog/alert/badge doesn't identify which pool it's about," the fix is NEVER "call `_posContextHtml()` / `_posLabel()` / `posStore.getActive()` at render time." Those helpers read the currently-viewed tab, not the position the server event is about. A failure on position A surfaced while the user is viewing position B will be mis-labeled.

The correct frame is: **"every server-originated UI artifact must carry its originating position identity through the data path."** That means:

- Walk `data._allPositionStates` (or the equivalent per-position state map), not the flattened viewed-position object.
- Dedup by composite key, not by module-level boolean flags.
- Derive the label from the iterated `(key, state)` pair — build a `...ForState(key, st)` context helper if one doesn't exist.
- Fire one artifact per triggered position — concurrent events must not collapse into a single dialog.

**Why:** Real-world bug history on this project:
  1. Mission Control "Special Action" badge (PR #68): showed the viewed tab's pool instead of the pool whose compound/rebalance was actually running.
  2. "Rebalance Failed" / "Position Recovered" / "Range Width Adjusted" / "Residual Above Threshold" modals (fix-identifying-information-of-pool-on-dialog): PR #67 "added position info to dialogs" but via `_posContextHtml()` which reads `posStore.getActive()` — so dialogs kept labeling with the viewed tab. User spent a day in production testing a fix that missed the root cause.

Both bugs were the same class. The first one not teaching me to look at the whole class cost real time.

**How to apply:** Any time the user reports a dialog/badge/log entry labeled with the wrong pool, check whether the trigger is server-originated (per-position state field) vs user-originated (button click). For server-originated, the ONLY acceptable fix is walk-all-states + per-key dedup + per-state label derivation. Don't offer narrower fixes as options — they will miss background-position failures.
