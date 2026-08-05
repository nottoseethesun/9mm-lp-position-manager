---
name: project_help_page
description: Help moved from popover to standalone page at /help.html with its own CSS
type: project
---

Help content moved from an inline popover (`#helpPopover` div) to a standalone page at `public/help.html`. The "? Help" button is now an `<a>` link that opens `/help.html` in a new tab.

- Styles in `public/help.css` (external, no inline styles)
- Uses plain `<ul>` and `<p>` elements (no `9mm-pos-mgr-help-*` classes — those stay for compact app contexts in `index.html`)
- Has a clickable table of contents with anchor links
- Includes "Supported Liquidity Pool Managers" and "Supported Blockchains" sections at bottom

**Why:** Better readability, proper documentation page rather than a cramped popover.
**How to apply:** All help text updates go in `public/help.html`. The `9mm-pos-mgr-help-*` classes in `9mm-pos-mgr.css` still serve `index.html` (throttle explanations, wallet modal text).
