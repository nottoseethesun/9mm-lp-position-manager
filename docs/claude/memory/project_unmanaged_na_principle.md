---
name: Unmanaged positions show N/A for rebalance-control status
description: Design principle for Unmanaged positions — any UI element about rebalance control/throttle/cap shows "N/A" with a circle-i tooltip "Only for Managed Positions"
type: project
originSessionId: ca6cd238-0010-4f82-88ce-354f7a7bc54e
---
For an **Unmanaged** position, the dashboard must not show any rebalance-control
status (CAPPED / THROTTLED / DOUBLING / OK / countdown / "Daily Limit" / etc.).
Instead, every such field renders as **"N/A"** (Not Applicable), accompanied by
a circle-i with the tooltip **"Only for Managed Positions"**.

**Why:** Unmanaged positions have no bot loop, no throttle counters, no cap, no
rebalance scheduling. Showing live-looking control state for them is misleading
(the false-CAPPED bug uncovered on Dev 2026-04-26 was the trigger for this
principle). The whole purpose of the Managed/Unmanaged distinction is to let
the user exclude information that is not of concern — Unmanaged should
*actively communicate* "not applicable" rather than render stale defaults.

**How to apply:**
- The pending fix for the false-CAPPED bug should follow this principle —
  detect unmanaged-position context in the throttle/banner/countdown
  renderers and short-circuit to "N/A" + circle-i tooltip, instead of
  bandaging server defaults.
- Applies to the throttle badge (CAPPED/THROTTLED/DOUBLING/NEAR LIMIT/OK),
  the kpiCountdown ("X min" / "X:XX:XX — Daily Limit"), the "Today"
  X / Y daily-count KPI, the doubling countdown, and the OOR-timeout
  countdown — anything that controls or reports on rebalance scheduling.
- The circle-i tooltip is a machine-default tooltip (browser `title=`),
  not a custom dialog. Short, terse: "Only for Managed Positions".
- Whatever IS shown for unmanaged today (Activity Log subset, lifetime
  P&L, KPIs from `_UNMANAGED_SETTINGS_KEYS`) keeps showing.
