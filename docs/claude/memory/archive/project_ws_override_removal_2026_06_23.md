---
name: project-ws-override-removal-2026-06-23
description: "CLOSED 2026-06-18 by PR #140 — ethers 6.17.0 shipped 6 days early with patched ws pinned; override dropped."
metadata: 
  node_type: memory
  type: project
  originSessionId: e17d18d9-be7e-475d-b752-a1fab7b154c0
---

**Status: CLOSED 2026-06-18 by PR #140** (`bump-ethers-drop-ws-override`, merge commit `c59fc17`). ethers shipped 6.17.0 with `ws@8.21.0` pinned directly (per ricmoo on [ethers Discussion #5155](https://github.com/ethers-io/ethers.js/discussions/5155)) 6 days earlier than the 2026-06-23 target date. Bumped `ethers` to `^6.17.0` and dropped the `"ws": "^8.21.0"` override; `npm ls ws` now shows `ethers@6.17.0 → ws@8.21.0` as the single resolution path; `npm audit --audit-level=high` is clean (0 high, 0 critical).

Original plan preserved below for historical reference.

---

After **2026-06-23** (one week from 2026-06-16), remove the `"ws": "^8.21.0"` override under `"overrides"` in `package.json` (currently at line 100) and rely on the new `ethers` release that pulls in the patched `ws` transitively.

**Why:** The user opened an ethers Discussion about the two `ws` high-sev CVEs (GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p). ricmoo confirmed a new ethers release will pin the patched `ws` itself, making our project-level override redundant. Source: <https://github.com/ethers-io/ethers.js/discussions/5155>.

**How to apply:**

- On or after 2026-06-23, check `npm view ethers versions` for a release published after the Discussion was answered. Confirm its `dependencies.ws` (or transitive resolution via `npm ls ws`) brings in `>= 8.18.0` (the patched line).
- If yes: bump `ethers` in `package.json` to the new version, delete the `"ws": "^8.21.0"` line under `overrides`, regenerate the lockfile (per [[feedback-regenerate-lockfile]] — delete + `npm install`, don't just edit), and run `npm run check` to confirm `npm audit` still passes.
- If no: the new ethers release hasn't shipped yet — leave the override in place and re-check in another week.
- The override was added in PR #135 (commit f55efbf) for the CI audit gate; it has no functional consequence beyond the security-pin.
