---
name: Never remove client-side browser console logs
description: Browser console.log statements in dashboard JS are permanent diagnostic logs — never remove them
type: feedback
---

Never remove client-side (browser) console.log statements from dashboard JS files. These are permanent diagnostic logs, just like the server-side rebalance diagnostic logs.

**Why:** User explicitly said "do not ever remove those" — they are valuable for debugging production issues in the browser console.

**How to apply:** When adding browser logging for diagnostics, keep it. When cleaning up for lint (line count), compact other code instead of removing logs. Prefix all client-side logs with "[lp-ranger]" for easy filtering.
