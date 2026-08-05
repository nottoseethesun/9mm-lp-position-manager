---
name: Never mix data into presentation formats
description: HTML/CSS/templates are for presentation only — never embed default values, config, or business data in them
type: feedback
---

Presentation-layer formats (HTML, CSS, templates, JSX markup) must contain ZERO data. No default values in `value=` attributes, no thresholds in CSS variables that drive logic, no business constants embedded in markup. Data lives in dedicated config files (JSON, env, server endpoints); presentation reads from data, never the other way around.

**Why:** When data lives in HTML, it becomes a hidden second source of truth. The CAPPED throttle badge bug happened because `inMaxReb` had `value="20"` hard-coded — when that was stripped, the client read `0` and the badge logic broke. The HTML had been silently authoritative for `dailyMax` instead of the server config. The bug was invisible until the duplication was removed.

**How to apply:** When writing or reviewing HTML/templates, every attribute that looks like data (`value=`, `data-*`, embedded numbers/strings) must come from a config source — `bot-config-defaults.json`, `/api/...` response, or similar. Empty `value=""` (or omitted) is correct; the JS init or server response fills it. Same rule for CSS: thresholds, breakpoints, and constants that the JS depends on belong in a JSON/JS module the JS reads, not in CSS variables that get parsed back out. If you find yourself writing a literal default into markup, stop — put it in the config and have the markup pull from there.
