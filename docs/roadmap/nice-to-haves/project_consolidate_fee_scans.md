# Derive Per-NFT Fees From One Scan Instead of Two

> **Status:** Nice-to-have / polish — not a bug. Both figures are
> correct today and agree with each other. Funds are never at risk.
> This is a structural cleanup that would make a future disagreement
> impossible by construction.

## Plain language

The app works out how much a position earned in trading fees twice
over, in two separate passes across the same blockchain records, and
files the answers in two different places. One answer feeds the
Per-Day P&L table; the other feeds the Lifetime panel's "Fees
Compounded" row.

Nothing compares them. For a long time they used different formulas
and quietly disagreed — the Per-Day table showed $149 where the
Lifetime panel showed $1,084 on the same position. Both now use the
same formula and match, but they are still worked out twice.

## Detail

| | Per-Day P&L table | Lifetime "Fees Compounded" |
| --- | --- | --- |
| Field | `snap.dailyPnl[].feePnl` | `snap.totalCompoundedUsd` |
| Store | `tmp/pnl-epochs-cache.json` | `app-config/user-configurable/bot-config.json` |
| Key | pool identity | composite key |
| Built by | `reconstructEpochs` → `getPositionHistory` | `_classifyAllCompounds` → `classifyCompounds` |
| Order | first | second |

Both read the same `Collect` and `DecreaseLiquidity` logs for the same
NFTs. On a full rebuild of a long rebalance chain that is roughly
double the log queries it needs.

## Status

Resolved as a correctness matter on 2026-09-02: both paths now call
`lifetimeFeeAmounts` in `src/compounder.js`, the single definition of
`Σ(Collect) − Σ(drained principal)`. Before that, `getPositionHistory`
used `Collect(last) − DecreaseLiquidity(last)` and so missed every fee
that auto-compound had already swept back into liquidity.

What remains is only the duplicated pass, which costs RPC calls on a
rebuild and leaves two stores that could drift again.

## Fix when prioritized

Have epoch reconstruction consume the per-NFT results the compound
scan already computes. The obstacle is ordering: `reconstructEpochs`
runs inside the history scan, before `_scanLifetimePoolData`, so those
results do not exist yet. Either move the compound scan ahead of
reconstruction, or have both draw from one cached per-NFT event fetch.

Deliberately deferred by the project owner: the data volume is small
and a rebuild is rare, so the duplicated work is not worth
restructuring the scan order for.
