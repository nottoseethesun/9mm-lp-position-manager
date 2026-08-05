---
name: bug-reports-on-dependencies
description: "`../bug-reports-on-dependencies/` (sibling of `lp-ranger/`) holds isolated repro packages for upstream dependency bugs — ready-to-paste READMEs, minimal input files, expected/actual outputs."
metadata: 
  node_type: memory
  type: reference
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

Sibling to the `lp-ranger/` project directory:
`/home/christophermbalz/code/lp-ranger-project/bug-reports-on-dependencies/`

Each subfolder is a self-contained package for an upstream dependency
bug the user may or may not have filed yet: an isolated input, the
tool's actual output, an expected output, a parser/verifier script,
and a ready-to-paste `README.md` that IS the issue body.

**Standing packages:**
- `prettier-css-hex-escape-linewrap/` — Prettier 3.9.5 line-wraps CSS
  selectors containing a `\39 ` hex escape, breaking the escape's
  whitespace terminator.  User set filing aside 2026-07-19 (limited
  time).  Escape avoidance also parked at
  [[project_code_cleanup_nice_to_haves]].

**When to use:**
- Landing a similar upstream bug: check whether a package already
  exists here before starting a fresh repro.
- User asks "did we file the Prettier one yet?" — the folder still
  being present is the "no, still parked" signal.
- When authoring a new package, keep it strictly isolated: no
  `9mm-pos-mgr-` prefixes, no LP Ranger paths, no project context in
  the CSS/JS files themselves.  The `README.md` may reference the
  observed real-world impact as an anonymized paragraph.
