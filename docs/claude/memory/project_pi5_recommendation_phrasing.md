---
name: Pi 5 recommendation phrasing (exact text)
description: Whenever Raspberry Pi 5 is mentioned in user-facing or doc text, include "with Heat Sink and Fan (5GB RAM, and Ethernet cable Internet connection instead of Wi-Fi)".
type: project
originSessionId: 2026-05-04-pause-fetch-fix
---

**Standardized phrasing (verbatim, decided 2026-05-04):**

> Raspberry Pi 5 with Heat Sink and Fan (5GB RAM, and Ethernet cable Internet connection instead of Wi-Fi)

This is the canonical form for **every** Pi 5 mention — README, help/manual page, engineering notes, and code comments alike. Even casual mentions ("on hardware like Raspberry Pi 5") and contextual mentions in code/JSON comments use the full phrase.

**Why:** The user wants the operator-environment recommendation to travel with the hardware reference so anyone copying a Pi 5 setup gets all three components (heat sink + fan, 5 GB RAM, wired Ethernet). The user explicitly extended the rule to non-recommendation mentions on 2026-05-04: "And those should include 'with Heat Sink and Fan' as well."

**How to apply:**
- New doc/comment that mentions a Pi 5: paste the full phrase.
- Editing existing text that mentions a Pi 5 in a different form: rewrite to the canonical form.
- Notable: "5GB" (no space) and "Wi-Fi" (hyphenated, capital W and F) are how the user wrote it — preserve spelling.
- Verified locations updated in PR #123 (0.7.3): `README.md`, `public/help-and-user-manual.html` (3 spots), `docs/engineering.md`, `public/dashboard-helpers.js` comment, `app-config/static-tunables/csrf.json` comment.
