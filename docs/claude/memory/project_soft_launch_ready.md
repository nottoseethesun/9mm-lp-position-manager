---
name: Soft-launch readiness declared 2026-04-24
description: User declared the app ready for soft-launch pending no more significant bugs surfacing
type: project
originSessionId: ca6cd238-0010-4f82-88ce-354f7a7bc54e
---
User declared soft-launch readiness on 2026-04-24 after Pi 5 resource validation ("Ok well if no more significant bugs, then this can be soft-launched"). Precondition: no further significant bugs surface. User then added: "We'll need to wait and let it run for a while" — i.e. burn-in period on prod before the soft-launch actually happens.

Release tag cut 2026-04-24: **"High Plains Drifter - 1"** — the first burn-in release off main, bundling the stabilization work and docs/UX polish described above. Naming ties to the new README title "Ride the Wild West of Your LP Ranges".

**Why:** Marks a phase transition beyond the 2026-04-09 MVP milestone. Caps a run of stabilization work — daily-count-keying fix, sync-badge fix, firstMintTimestamp preservation, event-scanner diagnostic logs (PR #75), full README/Help overhaul for onboarding (commits 7941a63, b6894c7, afb90d8, c29e941). Dev + prod both recover 90 rebalance events matching on-chain truth. Pi 5 baseline confirms the app runs comfortably on lightweight hardware.

**How to apply:** Treat stability and docs/UX polish as top priority over new features — even more so than the MVP-era guidance. Before suggesting any non-trivial change, ask whether it's necessary for the soft-launch or safe enough not to risk destabilizing it. Known nice-to-haves (rebalance-data-lag, route-via chain gap, suppress-OOR-until-synced, etc.) stay deferred unless the user explicitly picks one up. If a significant bug surfaces, that resets the "ready to soft-launch" flag — flag it to the user rather than quietly fixing and continuing.
