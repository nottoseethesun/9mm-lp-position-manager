---
name: Use the path being tested
description: When validating a trigger/workflow via a specific entry point, use that exact entry point — don't use a CLI shortcut that reaches the same end state
type: feedback
---

When the user's goal is to *validate* that something works via a specific path (UI, webhook, API call, etc.), execute via that path — not via a faster equivalent that bypasses the thing being tested.

**Why:** On 2026-04-20, after landing a workflow fallback for release builds, the user wanted to confirm a "normal UI-based Release creation" reliably triggers the workflow. At "Yep recreate" I used `gh release create` instead of waiting for the user to click through the GitHub UI. The end state (release + tarball) was correct, but the specific flow under test (UI publish → `release: published` event) wasn't exercised. The user noted they'd wanted the UI path.

**How to apply:** When the preceding conversation establishes that the goal is "make sure X works from Y" — do not substitute path Z to save a step, even with an explicit imperative. If I have a CLI shortcut available and it's ambiguous whether the user wants speed or the specific path, ask. Default to the path under test.
