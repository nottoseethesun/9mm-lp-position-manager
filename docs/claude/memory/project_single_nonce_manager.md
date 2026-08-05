---
name: Single NonceManager invariant
description: One shared NonceManager per wallet — never instantiate per-position or per-call; was the root cause of major prod instability
type: project
---

The bot must use exactly ONE `NonceManager` per wallet across all positions and all call sites. Multiple `NonceManager` instances wrapping the same signer was the single biggest source of prod instability before the fix.

**Why:** Each `NonceManager` keeps its own internal nonce counter. With multiple instances, two managers can hand out the same nonce → one TX replaces the other (same nonce, higher gas) or both revert. Symptoms include phantom "replacement transaction underpriced" errors, lost rebalances, and TXs that appear to confirm but never land. The rebalance lock alone is not sufficient — it serializes execution but doesn't fix nonce-counter divergence between separate manager instances.

**How to apply:** When touching anything that creates a signer, instantiates `NonceManager`, or sets up provider/signer plumbing (`bot-loop.js`, `bot-provider.js`, position-manager init, any new on-chain call site), verify it reuses the existing shared NonceManager. Never do `new NonceManager(signer)` inside a per-position function, per-call helper, or test setup that runs against the same wallet. Multi-position management means N positions, ONE NonceManager.
