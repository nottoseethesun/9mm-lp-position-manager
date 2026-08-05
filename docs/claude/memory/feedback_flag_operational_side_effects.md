---
name: flag-operational-side-effects
description: "When a change requires a server restart, hard-reload, cache clear, or other operational step to take effect, call it out proactively at commit time"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ef6c5215-1055-44cf-b98a-f7aa871665e8
---

When a change I just made requires an out-of-band operational step to actually take effect — restart the server, hard-reload the browser, clear the browser cache, restart the bot, etc. — flag it explicitly in the commit-summary reply. Don't wait for the user to notice the change isn't showing up.

**Why:** validated by the user on 2026-07-15 after I flagged that the SVG-extraction commit needed a server restart (new routes + new require) and a browser reload (new bundle). User replied "that's a great heads-up: Keep up the good work."

**How to apply:** After any of:
- New server-side module loaded at boot (routes, middleware, top-level `require`s, frozen `const` loaded from disk).
- Change to a JSON default whose value is loaded via a frozen `_FALLBACK` const at module init (not the per-request `loadMergedDefaults` re-read).
- New esbuild-bundled dependency, or first-time addition of a client asset.
- Anything that changes the `bundle.js` cache-bust hash — call out hard-reload if I've seen the user hitting cache issues in the session.

...include a one-line "Restart the server / hard-reload the browser after this reload" note in the commit-summary reply so the user doesn't have to guess why the change isn't visible yet.
