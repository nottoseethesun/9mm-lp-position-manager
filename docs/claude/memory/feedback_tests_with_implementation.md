---
name: Write tests alongside implementation
description: Never add uncovered src code and scramble for coverage afterward — write tests as you implement
type: feedback
---

Write tests for new code paths AS you implement them, not after. Adding 200 lines of uncovered src code then chasing 0.1% coverage gains with trivial helper tests wastes the user's time in an endless loop.

**Why:** User was frustrated by repeated coverage churn cycles that each moved the needle by 0.1%, burning hours. The root cause was adding feature code without corresponding tests.

**How to apply:** For every new function or code path, write a test before or immediately after. If the code needs RPC mocks, write the mocks as part of the implementation task. Never commit uncovered code and hope to fix it later.
