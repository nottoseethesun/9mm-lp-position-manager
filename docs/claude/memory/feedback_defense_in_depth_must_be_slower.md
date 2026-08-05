---
name: feedback-defense-in-depth-must-be-slower
description: "When adding a \"defense in depth\" backup mechanism, verify the backup is strictly slower / less aggressive than the primary. If the backup can fire first, it's not a backup — it's a competitor that defeats the primary fix."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e17d18d9-be7e-475d-b752-a1fab7b154c0
---

When designing redundancy ("X happens via primary path A; if A fails, B catches it"), the backup MUST be strictly slower / more conservative than the primary. If the backup can fire FIRST under any path, it isn't redundancy — it's a parallel mechanism that race-condition-defeats the primary.

**Concrete failure (2026-06-18, closed-position-reopen PR):**

Wanted: bot delays retire by 7.5 s after a failed re-open so the dashboard's 3 s poll can observe `rebalancePaused=true` and fire the alert modal. Primary mechanism: `setTimeout(_handleRetire, 7500)` in `bot-loop.js`'s `_handleError`.

Added "defense in depth": also set `_retireImmediately: true` on bot state, with drain.js firing retire if it ever sees that flag (in case setTimeout was somehow blocked by GC / event-loop stalls). Felt safe — drain.js only fires from the 60 s poll cycle, well after the 7.5 s window.

What actually happened: drain.js gets called from `_checkZeroLiquidity` inside `pollCycle`, which fires NOT just on the 60 s timer but also from the bot's initial **scan-completion** path on startup. For the re-open scenario, the bot is fresh-started by the user click, scans complete in ~2 s, pollCycle fires, drain.js sees `_retireImmediately`, retires immediately. The 7.5 s setTimeout never gets to fire — the position is gone, alert modal never shows.

**Diagnostic clue I missed:** the user's log showed retire at T+2 s with the log message *from the drain.js branch* (`"Auto-retiring re-open of #%s (failed immediately, no countdown, no notification)"`), not from the setTimeout (`"Re-open retire delay elapsed — auto-retiring #N"`). If I had added the setTimeout log earlier, the mismatch would have been obvious in one pass.

**Discipline going forward:**

1. **Verify the backup is strictly slower.** Walk through every code path that can read the backup signal. List the latency for each. If any path is faster than the primary's threshold, the backup is wrong.
2. **Log both paths.** When primary + backup compete, add distinct log lines so log analysis instantly identifies which fired.
3. **When in doubt, NO backup.** A simple "primary or bust" design is usually more correct than a poorly-designed redundant one. Add the backup only when you can prove it strictly cannot race.
4. **"Defense in depth" is a smell when retrofitted.** If the primary mechanism is robust, you don't need a backup. If the primary is fragile, fix the primary, don't paper over it.

Cross-links: [[feedback_trace_patterns_first]] (audit how existing code uses the signal before adding a new producer), [[feedback_finish_logic]] (trace every code path that fires the consumer).
