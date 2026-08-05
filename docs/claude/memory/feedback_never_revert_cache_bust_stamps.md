---
name: never-revert-cache-bust-stamps
description: "Cache-bust stamps (bundle.js?v=<ms> in index.html, cloud-PNG stamps in 9mm-pos-mgr.css): commit them ONLY when the same change also touches served assets under public/ (JS/CSS/images) — the stamp move IS the cache invalidation (assets served immutable/max-age=1y). On a docs- or src-only change (assets/ is NOT public/) where a stray local build dirtied the tree, the stamps are bare build artifacts: revert to HEAD, never commit. We never commit build artifacts."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

`npm run build` stamps `?v=<ms>` onto the asset URLs in
`public/index.html` (bundle.js, style.css, 9mm-pos-mgr.css) and onto
the cloud-PNG urls in `public/9mm-pos-mgr.css`.  Static assets are
served with `Cache-Control: public, max-age=31536000, immutable`
(server.js:293-295); only HTML is `no-store`.  **The stamp move is
the entire cache-invalidation mechanism.**

**Why:** On 2026-07-23 I treated the stamp changes as "drift" and
`git checkout`/`sed`-reverted them at every commit while the bundle
content was changing (save-gating fix).  The user's browser kept
serving its immutable-cached OLD bundle under the unchanged URL —
they retested a days-old bundle three times, reported "bug still
there" / "typing still refreshes the Doubling", and lost significant
time.  My jsdom tests were green because the source was right; the
browser was executing stale code.  User was rightly angry.

**How to apply:**
- If a branch changes ANYTHING that lands in the served assets
  (`public/dashboard-*.js`, `param-help-content.js`, CSS, images):
  run `npm run build` and **commit the stamped `index.html` (and
  `9mm-pos-mgr.css` if its stamps moved) as part of the change**.
- Only revert stamp drift when the build artifacts are NOT part of
  the change (e.g. a src/-only or docs-only branch where a stray
  local build dirtied the tree) — and then revert to the exact HEAD
  value, never an older one.
- When the user reports "still broken" on a change that is verifiably
  in the source and green in tests, CHECK THE STAMP/CACHE PATH FIRST
  — compare the committed `?v=` in index.html against the latest
  build's stamp before debugging the logic again.
