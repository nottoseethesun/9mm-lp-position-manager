---
name: flag-operational-side-effects
description: "Flag out-of-band steps a change needs to take effect (server restart, bot restart) — but NEVER tell the user to hard-reload or clear the browser cache: the cache-bust stamps make that unnecessary by construction, so a needed hard-refresh is a bug in the cache-bust, not an instruction"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ef6c5215-1055-44cf-b98a-f7aa871665e8
  modified: 2026-08-08T05:10:06.372Z
---

When a change I just made requires an out-of-band operational step to actually take effect — restart the server, restart the bot — flag it explicitly in the commit-summary reply. Don't wait for the user to notice the change isn't showing up.

**Why:** validated by the user on 2026-07-15 after I flagged that the SVG-extraction commit needed a server restart (new routes + new require). User replied "that's a great heads-up: Keep up the good work."

**How to apply:** After any of:

- New server-side module loaded at boot (routes, middleware, top-level `require`s, frozen `const` loaded from disk).
- Change to a JSON default whose value is loaded via a frozen `_FALLBACK` const at module init (not the per-request `loadMergedDefaults` re-read).
- New esbuild-bundled dependency, or first-time addition of a client asset.

...include a one-line "Restart the server after this" note in the commit-summary reply so the user doesn't have to guess why the change isn't visible yet.

## Never say "hard-reload"

**Do NOT tell the user to hard-reload, hard-refresh, or clear the browser cache after an asset change.** `npm run build` moves the `?v=<ms>` stamp on every served asset and HTML is `no-store`, so a plain reload picks up new JS/CSS **by construction**. Saying "hard-reload to pick up the stamp" is both noise and self-contradictory — the stamp is precisely what removes the need.

**Why:** user correction, 2026-08-08, after I closed two replies with "hard-reload to pick up the new stamp": *"hard-reload should never be needed, since we depend on the filename-level cache bust. No need to tell me to hard-refresh; if I have to hard-refresh, I know our cache-bust is itself busted."*

**How to apply:**

- Asset-only change → say nothing about reloading. Just note that the build ran.
- If the user reports a change not showing up in the browser, do NOT suggest a hard-refresh as the remedy. Treat it as a **defect signal in the cache-bust path** and debug that: is the served `?v=` stamp in `index.html` newer than the last build, did `npm run build` actually run, is the asset in `scripts/cache-bust.js`'s stamped set?
- Restart-the-server notes are unaffected — that step is real and still worth flagging.

Cross-links: [[never-revert-cache-bust-stamps]] — the stamps must be committed alongside asset changes for any of this to hold.
