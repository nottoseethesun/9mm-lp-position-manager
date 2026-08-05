---
name: Respect engineering invariants in every corner
description: Never violate single-source-of-truth or singleton-required invariants out of expedience; user expects basic engineering practice everywhere
type: feedback
---

Do not take shortcuts that violate baseline engineering practice — even in places that "feel" peripheral (HTML defaults, test setup, throwaway helpers, init code). The user assumes basic invariants are upheld everywhere and won't think to check the corners.

**Why:** Two real incidents drove this. (1) Real data defaults hard-coded into HTML `value=` attributes — the server should be the single source of truth, and when the HTML defaults were stripped, latent bugs surfaced (false CAPPED throttle badge, plus five other never-synced throttle fields). (2) Multiple `NonceManager` instances wrapping the same wallet — the single biggest source of pre-burn-in prod instability. Both were violations the user never thought to audit because they're so basic.

**How to apply:** When writing or reviewing any code, ask:
- Is there a single source of truth for this value? Am I duplicating it (HTML default + server config + client default)?
- Does this object have a singleton invariant (NonceManager, signer, provider, mutex, cache)? Am I instantiating a second one anywhere — including init paths, per-position helpers, or test setup against the same wallet?
- Am I reading state from the wrong layer (client memory instead of server, HTML attribute instead of API response)?

These checks apply to init code, helpers, tests, and "obvious" plumbing — not just the main happy path.
