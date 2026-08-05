---
name: Probe for friction during burn-in, don't wait for "bug" reports
description: During burn-in, proactively ask "anything felt off, even small?" — user notices issues early as inconveniences but may not classify them as bugs for days.
type: feedback
originSessionId: fb1fadfb-ea30-46f9-9dc1-433ca86b7011
---
During burn-in periods, "no reported issues" does not equal "no
issues."  The user has a real latency between noticing something
feels off and classifying it as a bug worth raising.

**Why:** On 2026-05-10, after 0.7.4 shipped, the user noted that both
0.7.3 inconveniences (sound backlog on idle return, LP-browser stale
after rebalance) were visible to them within the first couple of days
of the 6-day burn-in window — but it didn't click that they were
actually bugs until later.  Net result: ~4-5 days of "smooth sailing"
were actually days with two latent regressions present, just not yet
classified.  This calibrates how much weight to give a quiet burn-in
window.

**How to apply:**
- When the user is in burn-in mode (see `project_burn_in_release.md`),
  during natural conversation moments ask "anything felt slightly off
  — even if you don't think it's a bug?" rather than only responding
  to issues they explicitly flag.
- Treat "kind of annoying but workaroundable" reports as first-class
  signals, not afterthoughts.  The two 0.7.4 fixes were both exactly
  that profile: a manual click cleared it, so easy to dismiss.
- When estimating remaining burn-in time, factor in that latent
  papercuts may exist undetected for several days.  A 3-day quiet
  window is weaker evidence of stability than it appears.
