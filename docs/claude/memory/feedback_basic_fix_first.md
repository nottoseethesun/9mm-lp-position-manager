---
name: Look for basic fix first
description: Before proposing elaborate multi-option fixes, check if a simple reordering or one-line change solves it
type: feedback
---

Before proposing elaborate fix approaches (env-var overrides, two-commit strategies, amend tricks, client-side workarounds, etc.), look for the basic obvious fix first — often just reordering steps or a one-line change.

**Why:** On the release.yml fix, I proposed three elaborate approaches (env-var overrides + amend, two commits, client-side version-only comparison) when the actual fix was simply swapping the order of `npm version` and `npm run build`. User said "It is how I always used to do it" — the simple fix is usually the correct one. Going wild wastes their time reading options that shouldn't exist.

**How to apply:** When identifying a bug with multiple contributing factors, first ask: "Is there a trivial reorder / one-line / obvious fix?" Only escalate to complex approaches if the simple fix genuinely doesn't work. Lead with the simple fix, not a menu of options.
