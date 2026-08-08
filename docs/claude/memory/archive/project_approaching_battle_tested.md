---
name: project-approaching-battle-tested
description: "App is currently labelled Experimental / not fully battle-tested; user believes the in-flight `adjust-defaults-and-add-update-instructions` release is roughly the moment it crosses into fully battle-tested. Treat this as the next milestone after MVP / soft-launch / burn-in."
metadata: 
  node_type: memory
  type: project
  originSessionId: ee80f1a7-2778-41af-8f18-a3f5993e9278
---

User comment 2026-06-21: "Everyone was warned from the beginning that
this is still an Experimental app; not fully-battle tested.  Actually
I think that with this release, we are about 'there' (fully
battle-tested)."

**Why this matters:** the Experimental framing has been the standing
disclaimer used to justify low-friction trade-offs (e.g. the
[[feedback-go-slowly-means-signoff]] clean-break choice for the
`app-config/` → `app-config/user-configurable/` runtime-file
reorganization on this branch: operators must manually `mv` their old
files, with no auto-migration, because they were warned all along
this is Experimental). With "approaching fully battle-tested," that
license to leave sharp edges starts to expire.

**How to apply:**

- When proposing changes from here forward, weight risk-vs-friction
  closer to "production" than to "experimental" — fewer breaking
  defaults, more migration safety nets, more user-facing guard rails.
- Do NOT escalate the Experimental disclaimer in user-facing copy
  unsolicited; the user controls disclaimer wording and Release Notes.
- Related timeline memories ([[project-mvp-reached]],
  [[project-soft-launch-ready]], [[project-burn-in-release]]) form
  the staircase; "fully battle-tested" is the next step above
  burn-in, not a replacement for the prior milestones.
- Do NOT treat this as a directive to retroactively re-do already
  agreed work (e.g. the clean-break migration on this branch stays
  clean-break — the user just acknowledged the risk is acceptable).
