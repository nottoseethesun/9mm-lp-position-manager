---
name: regenerate-lockfile-periodically-and-before-assuming-overrides-are-needed
description: "The lockfile exists so the team shares an identical tree, but it must be deleted and regenerated periodically to pick up updates"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 53c63b8a-d973-4be1-8005-50ac113c57eb
---

The lockfile (`package-lock.json`) exists so every developer (and CI) installs the exact same dependency tree. But it must be **deleted and regenerated periodically** — otherwise transitive deps stay pinned at old versions indefinitely, even when the parent's caret range already accepts a newer patched release. Stale lockfiles are how unnecessary overrides and unpatched advisories accumulate.

Never add an npm override as the first response to a transitive-dep issue. Instead: delete **both `node_modules` and `package-lock.json`**, run `npm install`, and check whether the newer version resolves naturally. Only add an override if the parent's declared range genuinely excludes the fix (exact pin, range ceiling).

Do NOT do incremental `npm install` / `npm update <pkg>` and then investigate the resulting tree — that produced spurious dedup churn and even a stale `invalid` resolution (`@noble/hashes` under `@exodus/bytes`) that a clean full regen fixed automatically. Just blow the tree away and let Node rebuild it; don't overthink the dep graph.

**Why:** Two overrides (flatted, protobufjs) turned out to be unnecessary — lockfile regeneration resolved both because the parent ranges already accepted the patched versions. The overrides added false complexity to package.json.

**How to apply:** When an `npm audit` finding or a stale transitive dep appears: (1) check the parent's declared range via `npm view <parent> dependencies.<dep>`, (2) if the fix satisfies the range, delete `package-lock.json` and `npm install`, (3) only override if the range genuinely excludes the fix.
