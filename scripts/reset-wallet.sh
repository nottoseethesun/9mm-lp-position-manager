#!/usr/bin/env bash
# Reset the dashboard-imported wallet.
#
# Two actions, both idempotent:
#   1. Delete app-config/.wallet.json (encrypted wallet state).
#   2. Scrub any WALLET_PASSWORD=... line from .env so the next restart
#      re-prompts via the dashboard unlock dialog rather than auto-
#      unlocking from a stale plaintext password.
#
# Safe to run when either target is already absent.
#
# See docs/claude/CLAUDE-SECURITY.md § Wallet Password Persistence
# for why the WALLET_PASSWORD env-var fallback exists and its trade-off.

set -euo pipefail

WALLET_FILE="app-config/.wallet.json"
ENV_FILE=".env"

# ── 1. Delete the encrypted wallet file ──────────────────────────────────────
if [ -f "$WALLET_FILE" ]; then
  rm -f "$WALLET_FILE"
  echo "✔ Deleted $WALLET_FILE"
else
  echo "• $WALLET_FILE already absent"
fi

# ── 2. Scrub WALLET_PASSWORD from .env ───────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  if grep -q '^WALLET_PASSWORD=' "$ENV_FILE"; then
    tmp=$(mktemp)
    # Remove any line whose non-whitespace start is WALLET_PASSWORD=
    grep -v '^WALLET_PASSWORD=' "$ENV_FILE" > "$tmp"
    # Preserve file mode, then atomically swap in the scrubbed copy.
    chmod --reference="$ENV_FILE" "$tmp" 2>/dev/null || true
    mv "$tmp" "$ENV_FILE"
    echo "✔ Removed WALLET_PASSWORD from $ENV_FILE"
  else
    echo "• WALLET_PASSWORD not present in $ENV_FILE"
  fi
else
  echo "• $ENV_FILE not present"
fi

echo
echo "Re-import your wallet via the dashboard unlock dialog on next start."
