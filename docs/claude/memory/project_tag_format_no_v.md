---
name: tag-format-no-v-prefix
description: "Git tags for this project use strict semver — no `v` prefix. `0.8.10`, not `v0.8.10`."
metadata: 
  node_type: memory
  type: project
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

Git tags for this project use **strict semver**: `MAJOR.MINOR.PATCH`
with **no `v` prefix**.

Recent tags: `0.8.7`, `0.8.8`, `0.8.9`, `0.8.10`.  Very old tags
(`v0.2.0`, `v0.2.2`) did carry the `v` and are the exception, not the
pattern.

**Why:** Per the semver spec, the `v` is explicitly not part of the
version.  User was direct about this: "strict semver explicitly says
the v is not part of the version."

**How to apply:**
- When drafting release notes, tag names, or commands that refer to a
  version, write `0.8.10` — never `v0.8.10`.
- If the user gives a command containing `v` (as they did on
  2026-07-19), ask before mirroring it; the surrounding tag history is
  what's canonical, not the one-off command.

## Finding the latest tag — sort by version, not by date

Use `git tag --sort=-v:refname`, never `--sort=-creatordate`.

**Why:** On 2026-08-05 I drafted release notes against the wrong
baseline. `--sort=-creatordate` returned `0.8.13` as newest, so the notes
re-announced two features that had already shipped in `0.8.14`. The user
caught it: "we already released the self-healing token decimals."

Lightweight tags carry no tag object, so `creatordate` falls back to the
COMMIT date — which orders by when the code was written, not when it was
released. `0.8.14` pointed at an older commit than `0.8.13` did and sank
below it.

**How to apply:** get the baseline with `git tag --sort=-v:refname | head -1`,
then scope notes with `git log <baseline>..main`. Sanity-check by
confirming the previous release's headline features are NOT in the range.
