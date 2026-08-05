---
name: Reuse existing state before adding new
description: Don't add a new tracker/Map/flag when an existing piece of state can serve double duty with a small extra check
type: feedback
originSessionId: fb1fadfb-ea30-46f9-9dc1-433ca86b7011
---
When you need to coordinate two related concerns (e.g. one-shot log
gating AND retry-until-success), don't reach for a second
tracker/Map/flag.  Look for a way to reuse the existing piece of state
with a small extra check instead.

**Why:** The user explicitly called out "Your suggestion to add an
additional tracker for such a simple thing is pure bloat" when I
proposed `_scanCompletedRebAt` alongside `_lastRebAt` in
`dashboard-data-events.js` (PR #125, 2026-05-10).  The single-tracker
fix turned out cleaner: `_lastRebAt` advances inside `.then()` only
on `r.ok`, and concurrent in-flight scans dedupe via a check on the
same tracker (`_lastRebAt[key] === at` → already handled, return).
One Map, two concerns, no extra state.

**How to apply:** Before adding a new Map/Set/flag, ask: "Can the
existing state I'm about to read also serve as the marker for the
thing I'm about to track?  If I move the write-time of the existing
state, can it still gate everything that depended on it?"  If yes,
prefer that.  Especially relevant for fix patterns like
"set-flag-then-do-thing" → "do-thing-then-set-flag-on-success" — the
flag often already exists.

**Distinct from `feedback_kiss.md`:** KISS is about logic complexity
(one structural rule beats three fragile filters).  This is about
state count (one Map beats two when the second can be derived from
existing observations).
