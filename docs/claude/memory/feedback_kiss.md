---
name: feedback_kiss
description: Keep solutions simple — don't layer multiple complex approaches when one clean heuristic suffices
type: feedback
---

KISS — "keep it simple, stupid." Don't layer multiple filtering approaches (address exclusion lists, contract detection, etc.) when a single structural heuristic works. For example, "both tokens inbound in same TX = drain" is cleaner than maintaining a list of contract addresses to exclude.
**Why:** Complex multi-layered solutions are harder to debug, more likely to have gaps, and take longer to iterate on. The user has repeatedly had to correct overcomplicated approaches.
**How to apply:** Before implementing, ask: "Is there a simpler pattern that covers this?" Prefer behavioral/structural detection over identity-based detection. One robust rule beats three fragile ones.
