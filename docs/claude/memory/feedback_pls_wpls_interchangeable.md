---
name: PLS / wPLS terminology
description: User uses "PLS" and "wPLS" interchangeably in conversation; don't ask which they mean
type: feedback
originSessionId: ca6cd238-0010-4f82-88ce-354f7a7bc54e
---
The user uses "$PLS" and "$wPLS" interchangeably when talking about pool/LP/balance topics. Don't ask "do you mean PLS or wPLS?" — assume the contextually-correct one.

**Why:** wPLS is the wrapped/ERC-20 form of native PLS — the only form usable inside smart contracts (LPs, swaps, etc.). Native PLS has no Transfer event; it's wrapped by sending PLS to the WPLS contract's deposit().

**How to apply:**
- In LP / pool / contract-call / Transfer-event contexts → user almost certainly means wPLS even if they say "PLS".
- In wallet-balance / gas / "I sent X PLS" contexts → could be either; pick the one that makes the on-chain story consistent.
- In code reviews / log analysis → use the precise term the *contract* uses (almost always WPLS) regardless of which the user said.
- This matters for diagnostic flows: a user "depositing PLS" to an LP may actually have had to wrap it first, and that wrap step produces an extra Transfer event that classifiers must handle.
