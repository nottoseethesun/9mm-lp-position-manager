---
name: reference-release-notes-header
description: "docs/release-notes-header.md is the install-instructions blockquote the user prepends to every GitHub release body. Breaking-change releases REPLACE it with a release-specific from-scratch callout because the Update workflow can't carry state across a layout shift."
metadata:
  node_type: memory
  type: reference
  originSessionId: e17d18d9-be7e-475d-b752-a1fab7b154c0
---

`docs/release-notes-header.md` is a tiny markdown file holding the
standard install-instructions blockquote that the user prepends to
every GitHub release's body when cutting a release manually.

**Read the file, do not trust a copy.** This memory used to paste the
blockquote in full and the copy went stale: on 2026-09-02 the
first-time-install line changed from telling operators to skip the
`.sha256` to downloading *both* assets, with checksum verification
strongly recommended &mdash; the old wording talked people out of the one
step that detects a tampered download. Run
`cat docs/release-notes-header.md` before drafting anything that quotes it.

Its shape is two blockquoted paragraphs: **First-time install** (which
assets to download, a pointer to the verification step, then a link to
the Production install section) and **Updating an existing install?**
(do NOT follow Install; follow Update, which preserves wallet, managed
positions and overrides).

When summarizing changes for a release-notes draft, hand the user the
"what changed" body — they paste this header above it in the GitHub
UI themselves.  Per [[feedback-never-cut-release]] I never run
`gh release create`.

**Breaking-change exception (one-time, per-release).** For releases that
move runtime-file locations or otherwise break the standard `tar xvzf`
+ `util/update/migrate-app-state.js` Update path, the user REPLACES (or shadows the top of) the
standard header with a release-specific from-scratch callout because
the Update workflow can't carry state across the layout shift.
Canonical example: release `0.8.2` (2026-06-21, "Frank McLaury - 1"),
which moved runtime files into `app-config/user-configurable/` +
`app-data/` + `logs/`:

> **If you are running a previous release:** This release must be
> installed from scratch (delete your old installation directory and
> of course, make sure you have backups of your private keys and any
> api keys).

The release AFTER a breaking one returns to the standard header
template (the user confirmed this on 2026-06-21 for the post-0.8.2
release).

**How to apply:**

- When drafting release notes for a normal release, assume the
  standard `docs/release-notes-header.md` is what the user prepends
  — don't write Install/Update boilerplate into the body.
- When drafting release notes for a release that breaks the
  Update workflow (file relocations, on-disk format changes, etc.),
  flag this explicitly to the user and either (a) leave the
  breaking-change callout to them, or (b) draft one for their review
  using the 0.8.2 pattern above (short, operator-action-oriented,
  led with "If you are running a previous release").
- Do NOT silently edit `docs/release-notes-header.md` itself for a
  one-time breaking change — that file IS the standard template and
  should always reflect the long-lived Install/Update guidance.
