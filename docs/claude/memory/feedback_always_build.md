---
name: Always run npm run build after bundle-affecting changes
description: After editing any file in public/ (dashboard JS sources, CSS), always run `npm run build` so the user can just `npm start`
type: feedback
---

After editing any source file under `public/` that affects the built bundle — dashboard `*.js` modules, `style.css`, `9mm-pos-mgr.css`, `fonts.css` — always run `npm run build` before handing back to the user.

**Why:** `npm start` runs `node server.js` only; it does NOT build. If the build isn't fresh, the user reloads the page and sees stale code. User asked to never have to remember this step themselves.

**How to apply:** Whenever a commit touches `public/` sources, follow the edit with `npm run build` (fast — ~35ms via esbuild). Also run it after pulling / switching branches if the user is about to test. Skip only if the change is purely server-side (`src/`, `server.js`, etc.) and doesn't touch anything in `public/`.
