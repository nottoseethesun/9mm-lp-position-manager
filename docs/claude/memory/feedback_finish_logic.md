---
name: Finish the logic before moving on
description: When building a feature, trace every code path to completion before considering it done
type: feedback
---

When adding or modifying a feature, trace every code path to completion before moving on. If you build a guard system (like markInputDirty), verify that EVERY call site that needs it actually uses it — in the same session, before committing. Don't build the infrastructure and then forget to wire it up at the call sites.

**Why:** User was doom-looped on a threshold snap-back bug that was caused by save handlers not calling markInputDirty — a guard system that already existed specifically for this purpose. The save handlers were added without completing the logical chain: "this input gets posted to server → poll cycle will overwrite it → must mark dirty."

**How to apply:** After building any guard/flag/counter system, immediately grep for all call sites that should use it and wire them up. Don't commit until every path is covered. This is one logical chain — don't break focus partway through.
