---
name: Unmanaged view shows false OOR until synced
description: Low-priority nice-to-have — Unmanaged view briefly shows "out of range" before range/price finish rendering; Managed view displays perfectly
type: project
---

The Unmanaged view briefly shows a position as "out of range" when first opened, before the range bar + current price have finished rendering. Waiting ~1 minute self-heals (no reload needed). Managed view does not have this issue — it displays perfectly.

**Why:** Low priority because Unmanaged itself is low-priority in this app. But a false OOR banner is misleading to users who glance at the view.

**How to apply:** Improve the sync badge / gating for the Unmanaged view so the OOR indicator (and possibly the range bar) stays hidden or shows "Syncing..." until the Unmanaged data has fully populated. Likely touch points: `public/dashboard-unmanaged.js`, `public/dashboard-unmanaged-apply.js`, range render in `public/dashboard-data-status.js` or `public/dashboard-data-range.js`.

Confirmed on dev 2026-04-23 at URL `/pulsechain/.../159071`. Related but distinct from `project_sync_badge_closed_positions.md` (closed-position "Syncing..." badge stuck).
