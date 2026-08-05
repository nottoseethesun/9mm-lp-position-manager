---
name: Check existing guard patterns before deep investigation
description: When investigating UI bugs, check the existing guard/flag systems first before deep-diving
type: feedback
---

When a UI value snaps back or gets overwritten, check the existing guard patterns FIRST (markInputDirty/isInputDirty, generation counters, dirty flags). The codebase already has these systems — a missing call to an existing guard is one logical step, not a deep investigation. Don't waste the user's time with elaborate explorations when the answer is a missing function call in an obvious pattern.

**Why:** User was frustrated that I launched deep investigations for what was a trivially obvious missing `markInputDirty()` call. The dirty input system exists specifically to prevent poll-cycle overwrites, and any save handler missing it is an immediate red flag.

**How to apply:** Before exploring server-side flows, config spread order, or race conditions — check if the client-side guard system (dirty flags, generation counters) is being used correctly at the call site. Start with the simplest explanation.
