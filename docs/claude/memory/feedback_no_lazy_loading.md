---
name: No lazy loading
description: Never use lazy `require()` inside functions; always import at module top
type: feedback
---

NEVER use lazy `require()` calls inside function bodies in this project. Always import dependencies at the top of the module file.

**Why:** Excess complexity. If a top-level import would create a circular dependency, the right fix is to extract the shared piece into its own small module — not to defer the require. The codebase prioritizes clean module graphs over clever workarounds.

**How to apply:**
- Always require/import at the top of the file, even when the import would only be used inside one function.
- If two modules need to share something and currently have a one-way dependency, extracting the shared item to a third module is preferred over reverse-direction lazy requires.
- Tiny shared modules (e.g. `gecko-rate-limit.js` for a rate limiter shared between `price-fetcher.js` and `gecko-pool-cache.js`) are the right pattern when avoiding cycles.
