# Private memories

Machine-local memories that must **not** be published. This repository is
public; its production instance holds an unlocked wallet.

The directory is tracked, its contents are not — see `.gitignore` here. Same
pattern as `app-config/user-configurable/`.

## What belongs here

Anything that is not *absolutely* safe to publish:

- Infrastructure and remote-access details (which host runs what, how it is
  reached, what is hardened)
- Machine hostnames and their tier mapping
- Wallet or contract addresses that identify the operator on-chain
- Real position/NFT ids, balances, or P&L figures from live positions
- Incident notes that combine any of the above

## What does not

Generic engineering rules, architecture decisions, and workflow preferences
belong one level up, tracked, so they travel with the repo. If a rule is
generally useful but its *example* is identifying, keep the rule public and
replace the example with a placeholder (`0xWALL…ET1`, `#100001`) — see
`../feedback_logging.md`.

## Moving to a new machine

These files do not travel with `git clone`. Copy them out of band, or accept
that a fresh machine starts without them — everything tracked one level up is
still there.
