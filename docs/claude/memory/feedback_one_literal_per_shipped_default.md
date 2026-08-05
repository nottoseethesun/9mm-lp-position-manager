---
name: feedback-one-literal-per-shipped-default
description: "For every shipped config value, exactly ONE literal assignment in the app, and it must live in the shipped JSON file. Zero literals for values the app does not ship a default for (e.g., PRIVATE_KEY)."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ee80f1a7-2778-41af-8f18-a3f5993e9278
---

For every config value the app ships with a default, there must be at
most **ONE** literal assignment of that value in the entire codebase,
and that one literal **must live in the shipped JSON file** under
`app-config/app-defaults-for-user-configurable/`.

Some values have **zero** literals — values the app does not ship a
default for (e.g., `PRIVATE_KEY`, `WALLET_PASSWORD`).  Those are NEVER
hardcoded anywhere.

**No** `_FALLBACK` literals.  **No** `_CONFIG_INPUT_DEFAULTS` literals.
**No** env-var fallback literals in `parsePositiveInt(process.env.X,
<literal>)`.  **No** "keep this in sync with the JSON" comments.
Consumers source defaults via `loadShippedDefaults()` /
`loadMergedDefaults()` at module init.  The shipped JSON is the sole
chokepoint; everything else reads from it.

**Why:** Months of accreted duplication caused two real drifts that
the user discovered during an audit on 2026-06-21:

- `SLIPPAGE_PCT` was `0.75` in `src/config.js` but `0.5` in the
  shipped JSON (operators setting the env var saw 0.75; operators not
  setting it saw 0.5).
- `MAX_REBALANCES_PER_DAY` was `5` in `src/config.js` but `20` in the
  shipped JSON (same kind of split).

Each consumer was historically written self-contained with a
`_FALLBACK` literal as a "last-resort safety net"; no project-wide
rule said "the JSON is the SOLE source"; nobody noticed the drift
because the duplicates were never compared.  See
[[project-layered-config-refactor]] for the cleanup commit that
collapsed all ~42 duplicates to single-source.

**How to apply:**

- When **adding a new config value with a default**: put the literal
  ONLY in the appropriate shipped JSON under
  `app-config/app-defaults-for-user-configurable/`.  In code, read it
  via `loadShippedDefaults("<filename>.json")` at module init.
- When **reviewing a diff**: any new `_FALLBACK` / `DEFAULT_*` object
  literal in a consumer module, or any new `parsePositiveInt(process.env.X,
  <numeric-literal>)` is a red flag — push back.
- When **encountering a duplicate that already exists**: collapse it
  to the JSON immediately; do not leave it as "safety net" or "fallback."
- **Lint rule is intentionally NOT implemented** for this — the user
  explicitly declined the proposed AST/identifier-pattern rule
  (2026-06-21) because the invariant is semantic-not-syntactic and
  the lint rule would be brittle.  This is a serious engineering
  guideline enforced by convention + code review + the existence of
  the `loadShippedDefaults` / `loadMergedDefaults` chokepoint in
  `src/load-merged-defaults.js`.

Per-install operator overrides live at
`app-config/user-configurable/<same-name>.json` (gitignored,
tarball-upgrade-safe) and deep-merge on top of the shipped JSON at
runtime.  See [[project-layered-config-refactor]].
