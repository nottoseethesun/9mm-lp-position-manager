---
name: Always run npm run check before push
description: Run full local checks (lint+test+coverage) before every git push; Prettier in commit hook can break lint
type: feedback
---

ALWAYS run `npm run check` before pushing. The Prettier pre-commit hook
reformats code on commit, which can expand lines and break the max-lines
lint rule. Running lint before commit is NOT sufficient — the committed
code differs from what was linted.

**Why:** CI failed multiple times because Prettier expanded compacted code
after the commit hook ran, pushing files over 500 lines.
**How to apply:** After every `git commit`, run `npm run lint` (or full
`npm run check`) to verify the committed code still passes. If it fails,
fix and amend before pushing.
