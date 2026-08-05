---
name: No arbitrary dollar thresholds as guards
description: Don't use heuristic dollar amounts to filter/guard logic; someone could use small amounts legitimately
type: feedback
---

Don't use arbitrary dollar thresholds (like $1) as guards to filter out bad data.

**Why:** Suggested filtering epochs with entryValue < $1 to prevent bad epochs. User rejected: "Someone could be experimenting with very small amounts." The root cause (auto-opening with 0-liquidity) should be fixed directly, not masked with a threshold.

**How to apply:** Fix the root cause of bad data rather than filtering by dollar amount. Use condition checks (e.g., `if (value > 0)`) rather than magic number thresholds. This aligns with feedback_kiss — one clean fix at the source beats a layered heuristic downstream.
