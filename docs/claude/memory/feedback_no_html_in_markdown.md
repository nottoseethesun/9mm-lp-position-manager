---
name: no-html-in-markdown
description: "Markdown must be pure Markdown — NO inline HTML, ever (markdownlint MD033: true): no <p align=center> wrappers, no <img> tags. Also enforced: MD041 (first line must be a top-level H1) and MD040 (every fenced code block names a language)."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bfeda952-67a5-48dd-8d26-636cedf739e4
---

User is firm: "we don't want any html in our Markdown — that's why we use
Markdown." `.markdownlint-cli2.jsonc` enforces `MD033: true` (no inline HTML at
all), `MD041: true` (first line must be a top-level `#` H1), and MD040 (fenced
code needs a language). MD013 (line length) stays disabled; MD024 is
siblings_only.

**Why:** pure-Markdown portability + consistent rendering; HTML defeats the
point of using Markdown.

**How to apply:**
- Never emit inline HTML in `.md` files — no `<p align=center>`, `<img>`,
  `<div>`, `<br>`. Markdown has no centering, so accept left-alignment.
- **Banner / hero image:** insert as plain `![alt](path "title")`, placed
  DIRECTLY BELOW the H1 title — never as line 1 (MD041 needs the H1 first).
- **Sizing an image:** Markdown can't size images and `<img width>` is banned,
  so make a physically half-size sibling file (`convert orig -resize 50%
  orig-half.png`) and reference that — renders at the intended size everywhere,
  including local preview. Keep the full-size original as the GitHub social
  image.
- Give every ``` fence a language (`bash` / `text` / `json` / `markdown`).
- To locate violations, run the linter, don't hand-grep — see
  [[use-linter-to-locate-issues]]. Build stamps are never committed — see
  [[never-revert-cache-bust-stamps]].
