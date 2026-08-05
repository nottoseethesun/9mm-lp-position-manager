---
name: project_security_audit_two_tier
description: "Two security-audit workflows; the daily \"Latest Release\" one audits the release tag not main, so it clears only after a release is cut"
metadata: 
  node_type: memory
  type: project
  originSessionId: 53c63b8a-d973-4be1-8005-50ac113c57eb
---

The repo has **two** dependency-audit workflows, and they audit different things:

- `.github/workflows/security-audit.yml` — runs on push/PR to main, audits **main HEAD** (`npm run audit:deps` = `npm audit --audit-level=high`).
- `.github/workflows/security-audit-production.yml` "**Security Audit (Latest Release)**" — daily `schedule` (11:55 UTC) + `workflow_dispatch`; resolves the **latest published release tag** via `gh api .../releases/latest`, checks THAT tag out, and audits its lockfile — **not main**.

**Why this matters:** Newly-published npm advisories make the scheduled "Latest Release" audit go red even though no code changed. Fixing main clears the on-push audit but **NOT** the scheduled one — the release tag's lockfile is still vulnerable. The scheduled alert clears only when a **new release** is cut carrying the fixed lockfile. Per [[feedback_never_cut_release]] the user cuts every release; don't cut it yourself.

**How to apply** when the "Latest Release" audit fails:
1. Fix the deps on main (see [[feedback_regenerate_lockfile]] — regen lockfile; scoped override only if a parent exact-pins the vuln, as markdownlint-cli2 does for js-yaml).
2. Tell the user a release is required to clear the daily alert; wait for them to cut it.
3. After the release, verify without waiting for the daily schedule: `gh workflow run security-audit-production.yml --ref main`, then `gh run watch <id> --exit-status`.

Example: 2026-07-25 `brace-expansion` + `js-yaml` high advisories tripped it → fixed on main (commit 3157488) → user cut 0.8.13 → manual dispatch of the Latest-Release audit went green. The `elliptic`/`@ethersproject` chain stays as accepted low-severity (below the `--audit-level=high` gate, documented in CLAUDE-SECURITY.md).
