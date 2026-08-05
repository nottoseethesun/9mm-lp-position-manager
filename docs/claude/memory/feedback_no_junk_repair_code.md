---
name: feedback-no-junk-repair-code
description: "Never propose \"backfill\" (the word is banned) or heap repair/migration/dedup code onto a problem that reset-and-retry (restart, reinstall, wipe-settings) would solve for free."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ef6c5215-1055-44cf-b98a-f7aa871665e8
---

**The word "backfill" is banned.** Never propose one. Never write one. Never use the word in code, tests, docs, plans, PR titles, PR bodies, commit messages, or prose. Substitute vocabulary: "populate on cold load", "render on startup", "load from history", "read on first poll" — whatever describes the action without invoking the banned word.

If the user ever asks for a backfill, **resist as hard as possible** before doing anything: propose reset-and-retry, propose restarting from scratch, propose wiping settings, propose reinstalling. Only after explicit push-through from the user should a "backfill"-shaped operation happen, and even then avoid the word itself. The user has said (verbatim): *"Never go backfill."*

More broadly: never heap a s-ton of code onto a problem to "fix" state that can just be reset by running the program starting from scratch (restart, reinstall, `npm run wipe-settings`, clear localStorage, delete cache).

**Why:** The user regularly sees me propose migrations, dedup layers, defensive guards, per-entry cutoff timestamps, cross-session persistence, or other repair scaffolding to work around off-nominal state. Every one of those adds surface area, edge cases, and maintenance burden. The user's mental model is "state is disposable — just reset it." Complex repair code violates KISS ([[feedback-kiss]]) and racks up code for a scenario that reset-and-retry handles for free. "Backfill" is the archetypal name for that pattern, which is why the word itself has been banned.

**How to apply:**
- Before writing any repair/migration/dedup/history-populate code, ask: "would restarting the program / reinstalling / wiping settings achieve the same outcome?" If yes, prefer that route and note it in the plan.
- When proposing a plan, don't sneak in "defensive" dedup, "future-proof" migration guards, or "just in case" cross-version compat layers. User explicitly rejects that class of extra scope.
- If a plan reads *anything like* a backfill (repair, migrate, patch-up, dedup, sweep-and-rewrite), it's the wrong plan. Substitute reset-and-retry.
- If you genuinely need repair logic, spell out why reset isn't viable (durable state that can't be regenerated, active user data, blockchain history that would be lost) — don't just build it and hope.
- Related: [[feedback-hardening-minimal-scope]] (stay strictly within the named target); [[feedback-kiss]] (one clean heuristic over layered approaches); [[feedback-no-extra-state]] (reuse existing state before inventing new state).

**Precedent:** 2026-07-17 — I was renamed a branch (`activity-log-historical-compound-backfill` → `show-historical-compounds-in-activity-log`), a file (`dashboard-history-backfill.js` → `dashboard-populate-history.js`), a function (`resetHistoryBackfillFlags` → `resetPopulateHistoryFlags`), and had a nice-to-have doc titled "Historical Compound Log Backfill" removed — all because I initially used the banned word.
