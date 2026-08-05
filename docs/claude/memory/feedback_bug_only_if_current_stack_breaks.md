---
name: bug-only-if-current-stack-breaks
description: "Do not call something a 'bug' (latent or otherwise) if it only fails under a hypothetical alternative module loader / runtime / bundler the project does not use.  Frame it as an incompatibility with that future alternative, not a defect in what ships."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

Do not call something a "bug" — latent or otherwise — when the failing
scenario **only** manifests under a hypothetical alternative to what
the project actually ships.  If it works cleanly under the current
stack (bundler, runtime, module loader), it is not defective; it is
merely **incompatible with an alternative we are not adopting**.

**Why:** The user pushed back on my framing of the ESM circular-dep
TDZ I ran into during the jsdom test migration.  Under esbuild, the
IIFE the bundler emits orders the module bodies safely — circular
deps are known to work.  What actually happened is that my new tests
imported `dashboard-data-deposit.js` directly through Node ESM, which
does not do that ordering.  My change to move a top-level side effect
into an `initDataDepositWiring()` init function was a **test-
infrastructure accommodation** so the direct-ESM import path stopped
tripping — not a bug fix.  Calling it a "latent runtime bug" over-
claimed both the severity and the scope.

**How to apply:**

- Before labeling something a bug, ask: "does this fail under the
  actual runtime this project ships in?"  If the failure is only
  reproducible under a hypothetical alternative loader/runtime/
  bundler the project has no plans to adopt, it is **not a bug**.
- Correct framing: "incompatibility with X" or "prerequisite to
  supporting X", where X is the alternative.  If a change ships
  anyway, call the change what it is — a test-infra accommodation,
  a portability improvement, a defensive refactor — not a bug fix.
- This especially applies to fixes made in service of test tooling
  that imports code paths production never exercises.  A shape
  change to enable a test is not a bug fix even when the shape is
  arguably better.

Related codebase reality: esbuild bundling handles circular deps
without ordering issues; Node's direct ESM does not.  Both are known
and both are fine — the project ships bundled.
