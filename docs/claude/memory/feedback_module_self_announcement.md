---
name: Modules announce themselves; don't expose init hooks for foreign callers
description: When module A needs a lifecycle event (banner, "ready" signal, init) during module B's startup, use a require-side-effect in A — don't export `init()` and have B call it
type: feedback
originSessionId: ca6cd238-0010-4f82-88ce-354f7a7bc54e
---
When module A needs to fire something at startup (banner, registration, side effect), and B already loads A's machinery for its own legitimate reasons, put the side effect at A's top level (`console.log` / `register()` / etc., outside any function). B's `require("./a")` triggers it; module caching guarantees once-per-process.

**Do NOT** export an `init()` / `printBanner()` / `start()` function for B to call. That miscasts B as A's orchestrator and bleeds A's responsibilities into B.

**Why:** This bit me on the bot-banner refactor. I made `server.js` call `printBotStartedBanner()` from the bot module. The user's reaction: "Why on earth did you make `server.js` call a `printBotStartedBanner` function? The server is not the bot. The bot is not the server." The correct fix was a 1-line require-side-effect in `src/bot-banner.js` plus `require("./bot-banner")` at the top of a bot module that the server already loads (`src/bot-recorder.js`) — server.js never mentions the bot.

**How to apply:**
- Lifecycle markers (banners, version logs, telemetry init): top-level statement in the OWNING module, never an exported function called by a foreign module.
- Test: read the foreign module's code. If it has a line like `require("./other").startOther()` for a startup-only effect, that's the smell. Replace with `require("./other")` at the top of a module the foreign code already loads — and put the side effect at the owning module's top.
- Exception: when the side effect is genuinely parameterised by the caller (e.g., `installColorLogger()` patches console with caller-controlled config), an exported function is correct. Banners and self-identification calls are not parameterised.

Related but distinct: `feedback_engineering_invariants.md` (single-source-of-truth), `feedback_kiss.md` (prefer simple). This one is sharper: it's about respecting module identity / responsibilities at boundaries.
