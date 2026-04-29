# RPC Auto-Failover

> **Status:** Nice-to-have / polish — not a bug. The app works
> correctly today; the existing 3-bucket error classifier and
> startup-time RPC fallback handle real-world conditions on
> PulseChain. Funds are never at risk. This item only matters if
> a primary endpoint starts returning sustained terminal errors
> mid-session.

Mid-session RPC rotation on repeated saturation/terminal errors.

## Background

Today the bot uses a primary RPC with a startup-time fallback (via
`createProviderWithFallback`). If the primary RPC starts returning
terminal errors mid-session, the bot does not automatically rotate
to a different endpoint.

A 3-bucket error classifier
(`src/rpc-error-classifier.js` +
`app-config/static-tunables/evm-rpc-response-codes.json`) already
distinguishes transient / terminal-nonce-unused /
terminal-nonce-consumed errors. Public PulseChain RPCs have proven
reliable enough that mid-session rotation has not been needed.

## Design when prioritized

- Rotate when repeated terminal-nonce-unused aborts happen within a
  short window on the same RPC.
- Rotation point is the classifier's terminal-nonce-unused branch
  in `src/rebalancer-pools.js` `_retrySend`.
- Make rotation observable in logs + dashboard alert.
