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
