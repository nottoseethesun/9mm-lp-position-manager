---
name: Never compact code for line limits
description: Don't compress code formatting to fit max-lines; extract to separate files instead
type: feedback
---

Never compact code to fit the 500-line max-lines limit. Don't combine lines, use prettier-ignore, or squeeze formatting.

**Why:** Compacted code is harder to read and Prettier will re-expand it anyway, causing CI failures.
**How to apply:** When a file exceeds 500 lines, extract functions or sections into a new file (the codebase already follows this pattern, e.g. bot-pnl-updater.js was extracted from bot-loop.js).
