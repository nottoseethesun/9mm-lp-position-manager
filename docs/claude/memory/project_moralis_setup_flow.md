---
name: project_moralis_setup_flow
description: Moralis API key can be entered during wallet setup (not just Settings gear)
type: project
---

The wallet import dialog (Generate / Seed / Private Key tabs) has an optional Moralis API Key field above the password entry on each tab. When the user imports their wallet, if a Moralis key is present, it's saved using the same password — no extra prompt. Uses the shared `saveMoralisApiKey()` from `dashboard-events.js`.

**Why:** User shouldn't have to wait for GeckoTerminal rate limits on first scan. Entering the key during setup ensures Moralis is available immediately.
**How to apply:** The field uses class `setupMoralisKeyInput` (CSS class, not ID, since it appears on all 3 tabs). The Generate tab's field is `initially-hidden` and shown after wallet generation via `genMoralisField`.
