---
name: Price source priority (implemented)
description: Implemented — Moralis → GeckoTerminal → DexScreener for current and historical prices
type: project
---

Implemented as of 2026-04-09 in PR #30.

Current prices (fetchTokenPriceUsd): Moralis → GeckoTerminal → DexScreener
via tryPriceSources() in price-fetcher.js.

Historical prices (fetchHistoricalPriceGecko): Moralis by block → GeckoTerminal
OHLCV by pool address. If both return 0, _totalLifetimeDeposit falls back to
current prices via fetchTokenPriceUsd (logged as "current-price fallback").

Settings dialog has a Moralis API key indicator dot (green=valid, red=invalid,
aqua outline=none). Session password eliminates the separate password prompt.
Moralis key validated on startup after wallet unlock.

**Why:** DexScreener drops tokens with no 24h activity; Moralis is most reliable.
**How to apply:** All price fetching goes through price-fetcher.js. Never
duplicate price-fetching code elsewhere (audited clean 2026-04-09).
