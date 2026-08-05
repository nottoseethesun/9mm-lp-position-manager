---
name: feedback_canonical_info_icon
description: "Circle-i info icons = .9mm-pos-mgr-il-info-btn + literal \"i\"; never the .9mm-pos-mgr-info-icon glyph"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 78a8529a-26ef-44db-9111-a84bd3dec37f
---

The user requires all circle-i info icons to be visually uniform across the dashboard. The **canonical** circle-i is `.9mm-pos-mgr-il-info-btn` — a 24px CSS-drawn circle containing a literal lowercase `i`, used ~30× app-wide. HTML: `<span class="9mm-pos-mgr-il-info-btn" title="…">i</span>` for a **tooltip-only** icon, or add `data-param-help="…"` to open the param-help dialog (`dashboard-param-help.js` binds `[data-param-help]`).

**Why:** A one-off variant `.9mm-pos-mgr-info-icon` + Unicode glyph `&#x24D8;` (ⓘ; `cursor:help`, no circle background) renders differently and looked out of place — the user flagged it on the Pool Details manual-decimals form (PR #176) and required an **exact style + HTML match** to the standard. (A third class, `.9mm-pos-mgr-info-dot` inside `.9mm-pos-mgr-info-wrap`/`-info-popover`, is a hover-popover mechanism for the residual "i" — different purpose, don't conflate.)

**How to apply:** New info icon → `.9mm-pos-mgr-il-info-btn` + literal `i` + `title`. Tooltip-only = omit `data-param-help` and any click wiring. For these tooltip-only icons the user chose the exact-match look (`cursor:pointer` inherited from the class, matching every other info-btn) over the general "inert+title → cursor:help" preference — so do NOT add a `cursor:help` override here; that would re-introduce the divergence. Never use `.9mm-pos-mgr-info-icon` / `&#x24D8;`. Related: [[feedback_help_cursor_on_title]], [[feedback_css_classes_purpose]], [[feedback_no_data_in_presentation]].
