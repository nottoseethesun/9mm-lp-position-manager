---
name: Think through full data lifecycle before planning
description: Always consider fetch → cache → invalidate → incremental update before proposing a design
type: feedback
---

Think through the full data lifecycle before presenting a plan: fetch → cache → invalidate → incremental update. Don't propose one-shot scans when the codebase already has incremental scanning patterns (e.g., event-scanner.js uses fromBlock/lastBlock).

**Why:** User was frustrated that the plan proposed a guard-and-skip pattern for compound/HODL scanning when the obvious approach is incremental scanning (fromBlock), which the codebase already implements for rebalance events. Should have caught this without being told.

**How to apply:** Before proposing any scan/fetch design, ask: (1) Is there existing data to resume from? (2) What happens when new data appears after the initial scan? (3) What existing patterns handle this already? Match them.
