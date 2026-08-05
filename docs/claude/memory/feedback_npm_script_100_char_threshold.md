---
name: feedback-npm-script-100-char-threshold
description: npm script inline commands over 100 chars must be extracted to a standalone file under scripts/ and documented in docs/engineering.md.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e17d18d9-be7e-475d-b752-a1fab7b154c0
---

When an npm script's inline command string in `package.json` exceeds **100 characters**, extract the logic to a standalone Node script under `scripts/` and have the npm entry point shell out to it (e.g. `"foo": "node scripts/foo.js"`). Then document the new script in the appropriate section of `docs/engineering.md`.

**Why:** Long inline `package.json` shell strings are hard to review, lint, and test. They mix shell quoting rules with JSON escaping, get truncated in `npm run` output, and tend to grow stale comments. A standalone `scripts/*.js` file is easier to grep for, gets full ESLint coverage, and can be unit-tested. Cross-referencing in `docs/engineering.md` ensures the script is discoverable instead of buried in `npm scripts`.

**How to apply:**

- Count the inline command's length (everything after the `:` and before the trailing `,`). Threshold is ~100 chars.
- Under the threshold and already cleanly expressible inline (a single `node …` invocation, an `rm -rf` cleanup, etc.) → leave inline.
- Over the threshold OR mixing multiple distinct steps → extract to `scripts/<name>.js`, point the npm entry at it, and add a row to the appropriate table in `docs/engineering.md` (Debugging, Tooling, Reset/Clean, etc.) describing what it does and when to use it.
- Shared helpers between scripts (PID lookup, port discovery, etc.) live in `scripts/_<helper>.js` — the leading underscore marks them as internal.
