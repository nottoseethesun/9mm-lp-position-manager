---
name: feedback_no_delay_patches
description: Never use setTimeout/delay as a fix when proper await/async flow control would solve the problem
type: feedback
---

Never patch with a delay (setTimeout, sleep) when you can use await properly.
**Why:** Delays are race condition band-aids — they work "most of the time" but fail under load or on slower machines (like CI runners). Proper async flow control is deterministic.
**How to apply:** When a timing issue arises, trace the async chain and fix the control flow rather than inserting a delay. If a timer is needed for production purposes (like retry backoff), ensure tests don't depend on the timer completing — mock it or use proper async synchronization.
