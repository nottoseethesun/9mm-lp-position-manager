---
name: feedback_one_lint_target_list
description: All lint/format/security checks defined in ONE command; file lists live only in scripts/lint-targets.js — never a parallel list in check.js or a hook
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8264efa3-921c-4733-b040-c9845e2b3a5e
  modified: 2026-08-05T03:33:13.323Z
---

`npm run lint` is the master command. Every check is defined there, and the
husky pre-commit hook simply runs it. File lists live in exactly one place:
`scripts/lint-targets.js` (`JS_TARGETS`, `SECURITY_TARGETS`, `SECRET_TARGETS`),
imported by `scripts/format.js`, `scripts/audit.js`, and `scripts/check.js`.

**Why:** Stated by the user 2026-08-04. Parallel definitions had silently
drifted — `scripts/check.js` named its own directories for the ESLint,
security-lint and secretlint passes and omitted `util/` from all three, so the
gate CI runs covered 23 fewer files than the standalone commands. Separately,
the pre-commit hook ran its own `lint-staged` rule (`*.js` → `prettier --write`)
so JS formatting was written on commit but verified by no gate at all.

**How to apply:** Never add a file list to `check.js`, a hook, or an npm
script — import it. An npm script needing a list becomes a thin
`scripts/<name>.js` runner (also satisfies
[[feedback_npm_script_100_char_threshold]]).
`test/lint-targets.test.js` fails if a parallel list reappears, if the hook
stops calling `npm run lint`, or if `lint-staged` returns.

Consequence to remember: a commit with unformatted JS now FAILS rather than
being auto-rewritten — run `npm run format` (never `npx`, see
[[feedback_no_npx]]). Fixed in 9bfe589.
