---
name: Never push with flaky tests
description: Fix flaky tests before pushing; don't let known-flaky tests reach CI
type: feedback
---

Never push code when you know a test is flaky. Fix the flake first.

**Why:** User was frustrated when epoch-cache test failed in CI due to concurrent file access. The flake was known but pushed anyway. "Why would you push with a flaky test?"

**How to apply:** If any test shows intermittent failures during local runs, diagnose and fix before pushing. Common causes: shared file paths (use _setCachePath or tmpDir), timing (use proper await, not delays), global state (isolate per test). Run the full suite at least once clean locally before pushing.

(Also covered the duplicate slug `feedback_no_push_flaky`, now removed.)
