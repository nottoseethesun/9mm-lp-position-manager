---
name: Config stomp investigation
description: .bot-config.json has been silently overwritten multiple times; root cause unknown, guards in place
type: project
---

The .bot-config.json has been silently overwritten/shrunk multiple times,
losing managed positions and all per-position settings. Root cause is
UNKNOWN as of 2026-04-09.

Mitigations in place:
- Backup on load (.bot-config.backup.json)
- saveConfig guard: refuses to write if running positions would vanish
- Diagnostic logging: every save logs caller stack, position count delta

If the guard fires, the caller stack trace in the server log will identify
the root cause. The backup file can restore lost config.

**Why:** Real money at stake — lost config means positions stop being managed.
**How to apply:** Watch for `[config] REFUSING` in server logs. If it fires,
the stack trace is the clue. Don't remove the guards until root cause is found.
