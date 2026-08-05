---
name: "Revert" means code changes, not the plan file
description: "Revert all the changes" applies to repo/code edits only — never to the in-flight plan file in plan mode.
type: feedback
originSessionId: 6410b15f-f74f-4f19-a2ae-51cdd70744eb
---
When the user says "revert" / "revert all the changes" / "undo it" while in plan mode (or while a plan file exists), they mean **code/repo changes only**. The plan file is the working canvas for the conversation; preserve it unless explicitly told to discard the plan.

**Why:** On 2026-05-04 the user said "Revert all the changes, since I never agreed to any" — I deleted the plan file along with checking the repo. They corrected: "I didn't tell you to delete the Plan!" The plan was actively being iterated on; deleting it lost a draft they were still using.

**How to apply:** On any "revert" instruction, scope to:
- `git restore` / repo working tree (only files I actually edited)
- Never `rm` the plan file at `~/.claude/plans/<slug>.md`
- If unsure whether the plan file is in scope, ask before deleting.
