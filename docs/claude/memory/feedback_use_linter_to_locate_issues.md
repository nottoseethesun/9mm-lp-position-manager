---
name: use-linter-to-locate-issues
description: "To find where a lint rule will fire (e.g. HTML in Markdown before tightening MD033), run the actual linter and use its file:line output — do NOT hand-grep or predict the blast radius. Grep flags false positives (HTML inside code spans/fences, autolinks) the linter correctly ignores."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bfeda952-67a5-48dd-8d26-636cedf739e4
---

When a change will make a linter stricter (or you need to locate existing
violations), **run the linter and read its output** to find the exact
file:line hits. Don't grep the tree to predict what will break.

**Why:** On 2026-07-26, before tightening markdownlint `MD033` to forbid
all inline HTML, I grepped every linted Markdown file to predict which
ones contained HTML. The user rejected that and said to just run the lint
and let it report where the HTML is. The linter knows what grep can't:
HTML inside `` `code spans` `` and ```` ```fences``` ```` is ignored, and
`<https://…>` autolinks are Markdown, not HTML — grep flags all of these
as false positives, creating noise and wasted analysis.

**How to apply:**
- Make the rule change, then run the relevant lint (targeted
  `markdownlint-cli2 <files>` for a fast loop, or `npm run lint` for the
  authoritative pass) and fix exactly the file:line hits it reports.
- Trust the linter's code-span / fence / autolink handling over a regex.
- Same idea as validating via the real path — see
  [[feedback_use_the_path_being_tested]].
