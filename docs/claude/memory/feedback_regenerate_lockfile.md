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

## Order matters, and `--dry-run` lies (2026-08-08)

This rule already said "delete **both**". I did not follow it, and CI went
red on PR #189 — every job that starts with `npm ci` died in ~10 seconds:

```text
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json are in sync.
npm error Missing: @noble/hashes@1.8.0 from lock file   (x3)
```

Adding one devDependency (`yaml`) had updated package.json but left the
lock tree incomplete — it carried that transitive only under `pdfkit`,
while the resolved tree also needed it under `jsdom` and
`html-encoding-sniffer`.

Two things this incident adds:

- **Delete the lockfile FIRST, then `node_modules`, then install.**
  Deleting the lockfile alone did nothing: `npm install` reported "up to
  date" and rebuilt the identical broken tree, because the surviving
  `node_modules` steered resolution straight back to it. The user, after
  watching me try it the slow way: "First before anything, delete the
  package-lock and then delete node_modules and only then, continue."
- **`npm ci --dry-run` PASSES against a broken lockfile.** It passed for
  me while real CI failed. Only `rm -rf node_modules && npm ci` reproduces
  what CI does. Never take a dry run as proof.

**Failure signature to recognize:** several CI jobs failing in ~10s each
(install-time, not test-time) with "Missing: <pkg> from lock file". Go
straight to the two-step deletion; do not investigate the dep graph.
