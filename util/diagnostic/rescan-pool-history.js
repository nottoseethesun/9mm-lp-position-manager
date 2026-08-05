#!/usr/bin/env node
/**
 * @file util/diagnostic/rescan-pool-history.js
 * @description
 * One-shot recovery tool that forces a from-pool-creation rescan of a
 * managed position's lifetime compound + deposit history.  Use when
 * `compoundHistory` and/or `totalLifetimeDepositUsd` on disk are wrong
 * (e.g. zeroed by a stomp from a stale `lastNftScanBlock` partial scan
 * — see `src/bot-recorder-lifetime.js`'s disk-as-source-of-truth gate
 * for the underlying bug class) and you want the bot to rebuild them
 * from on-chain `IncreaseLiquidity` + `Collect` events on the next
 * restart.
 *
 * Why this isn't a Settings button:
 *   The action is destructive — it zeroes the very fields the gate is
 *   protecting.  If the rescan returns wrong/partial data (RPC flake,
 *   GeckoTerminal rate-limit), the click loses the correct totals.
 *   A deliberate CLI step is the feature here, not the friction.
 *
 * What it does (in order):
 *   1. Loads `app-config/user-configurable/bot-config.json` and resolves
 *      the position by
 *      tokenId (or by full composite key components if disambiguation
 *      is needed).
 *   2. Loads `tmp/pnl-epochs-cache.json` and finds the pool epoch key
 *      that the position belongs to (matched by blockchain + contract +
 *      wallet — the per-pool key uses these plus token0/token1/fee).
 *   3. Prints a summary of what will change and prompts y/N.  Aborts
 *      on anything other than `y` / `yes`.
 *   4. Writes timestamped backup copies of both files alongside the
 *      originals (`.pre-rescan.<ISO>.json` suffix).
 *   5. Deletes `lastNftScanBlock` from the pool's epoch entry → next
 *      scan starts from pool creation block, not a stale watermark.
 *   6. Removes `totalCompoundedUsd`, `compoundHistory`, `lastCompoundAt`,
 *      `totalLifetimeDepositUsd`, `depositUsedFallback` from the
 *      position config → `hasCompoundData=false` and `hasDepositData=
 *      false` so the gate in `_scanLifetimePoolData` does not
 *      short-circuit.
 *   7. Prints the restart command.
 *
 * What it does NOT touch:
 *   - `lifetimeHodl` cache (HODL math survives) unless `--clear-hodl`
 *     is passed.
 *   - Live in-memory bot state.  The bot reads the cleared values from
 *     disk only on next startup (`createPerPositionBotState` in
 *     `src/server-positions.js`), which is why a restart is required.
 *   - Any other position or pool.
 *
 * Usage:
 *   node util/diagnostic/rescan-pool-history.js <tokenId> [options]
 *
 * Options:
 *   --blockchain <name>   default: pulsechain
 *   --wallet <0x...>      required if multiple positions match tokenId
 *   --contract <0x...>    default: only-match if exactly one position
 *                         in config has that tokenId
 *   --token0 <addr>       required when the wallet has multiple managed
 *   --token1 <addr>       pools on the same contract — the script will
 *   --fee <int>           list the candidates and refuse to proceed
 *                         without these flags
 *   --clear-hodl          ALSO drop the cached lifetimeHodl for the pool
 *                         (forces hodl recompute too — slower restart)
 *   --yes                 skip the y/N prompt (for scripted recovery)
 *
 * Examples:
 *   node util/diagnostic/rescan-pool-history.js 159289
 *   node util/diagnostic/rescan-pool-history.js 159289 --wallet 0x4e44...
 *   node util/diagnostic/rescan-pool-history.js 159289 --yes
 *
 * Exit codes:
 *   0 — completed (or user aborted at prompt)
 *   1 — bad arguments, position not found, or ambiguous match
 *   2 — config file missing or unparseable
 */

"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CONFIG_PATH = path.resolve(
  "app-config/user-configurable/bot-config.json",
);
const EPOCH_CACHE_PATH = path.resolve("tmp/pnl-epochs-cache.json");

/** Parse a `--flag value` style CLI args object from process.argv. */
function _parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[name] = next;
        i++;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

/** Load + parse a JSON file, exiting with code 2 on any failure. */
function _loadJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(
      "[rescan] failed to read %s (%s): %s",
      label,
      filePath,
      err.message,
    );
    process.exit(2);
  }
}

/** Atomic-ish write: tmp file + rename, matches saveConfig style. */
function _writeJson(filePath, obj) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, filePath);
}

/** Find the position composite key matching the given tokenId + filters. */
function _findPositionKey(positions, tokenId, flags) {
  const matches = Object.keys(positions).filter((k) => {
    const parts = k.split("-");
    if (parts.length !== 4) return false;
    if (parts[3] !== tokenId) return false;
    if (flags.blockchain && parts[0] !== flags.blockchain) return false;
    if (flags.wallet && parts[1].toLowerCase() !== flags.wallet.toLowerCase())
      return false;
    if (
      flags.contract &&
      parts[2].toLowerCase() !== flags.contract.toLowerCase()
    )
      return false;
    return true;
  });
  if (matches.length === 0) {
    console.error(
      "[rescan] no position with tokenId=%s%s",
      tokenId,
      _filterDescription(flags),
    );
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(
      "[rescan] AMBIGUOUS — %d positions match tokenId=%s." +
        " Disambiguate with --wallet or --contract:",
      matches.length,
      tokenId,
    );
    for (const k of matches) console.error("  %s", k);
    process.exit(1);
  }
  return matches[0];
}

/** Render the active filter set for error-message context. */
function _filterDescription(flags) {
  const parts = [];
  if (flags.blockchain) parts.push("blockchain=" + flags.blockchain);
  if (flags.wallet) parts.push("wallet=" + flags.wallet);
  if (flags.contract) parts.push("contract=" + flags.contract);
  return parts.length ? " (" + parts.join(", ") + ")" : "";
}

/**
 * Find the pool epoch-cache key that this position belongs to.  The
 * cache key shape is `blockchain.contract.wallet.token0.token1.fee` —
 * we match on the first three components since the position config
 * doesn't carry token0/token1/fee.  When multiple pools share that
 * prefix (same wallet has multiple managed positions on the same
 * NonfungiblePositionManager contract — the common case), the caller
 * must disambiguate with `--token0`, `--token1`, and `--fee` flags.
 * Blasting `lastNftScanBlock` on every match would force unrelated
 * pools into expensive from-creation rescans.
 */
function _findPoolKey(epochCache, posKey, flags) {
  const [blockchain, wallet, contract] = posKey.split("-");
  const segs = [
    blockchain.toLowerCase(),
    contract.toLowerCase(),
    wallet.toLowerCase(),
  ];
  if (flags.token0) segs.push(flags.token0.toLowerCase());
  if (flags.token1) segs.push(flags.token1.toLowerCase());
  if (flags.fee) segs.push(String(flags.fee).toLowerCase());
  const prefix = segs.join(".");
  const matches = Object.keys(epochCache).filter((k) => {
    const lk = k.toLowerCase();
    /*-
     *  Require an exact key match when all six components are supplied,
     *  otherwise startsWith — but with a `.` boundary so a partial
     *  segment can't false-match (e.g. token0=0xabc must not match a
     *  key whose token0 is 0xabcdef…).
     */
    return lk === prefix || lk.startsWith(prefix + ".");
  });
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    console.error(
      "[rescan] AMBIGUOUS — %d pool epoch entries match this wallet+contract:",
      matches.length,
    );
    for (const k of matches) console.error("  %s", k);
    console.error("");
    console.error(
      "[rescan] Disambiguate with --token0 <addr> --token1 <addr> --fee <int>",
    );
    console.error(
      "[rescan] (extracted from one of the keys above — the order after" +
        " the wallet is token0.token1.fee)",
    );
    process.exit(1);
  }
  return matches;
}

/** Print a one-screen summary of pending changes for the y/N prompt. */
function _printPlan(posKey, pos, poolKeys, flags) {
  console.log("");
  console.log("=== Rescan plan ===");
  console.log("Position key: %s", posKey);
  console.log("");
  console.log("On disk now:");
  console.log("  totalCompoundedUsd:       %s", pos.totalCompoundedUsd ?? "—");
  console.log(
    "  compoundHistory.length:   %d",
    (pos.compoundHistory || []).length,
  );
  console.log("  lastCompoundAt:           %s", pos.lastCompoundAt ?? "—");
  console.log(
    "  totalLifetimeDepositUsd:  %s",
    pos.totalLifetimeDepositUsd ?? "—",
  );
  console.log("");
  console.log("Will be cleared (so the rescan can rebuild from chain):");
  console.log("  - position.totalCompoundedUsd");
  console.log("  - position.compoundHistory");
  console.log("  - position.lastCompoundAt");
  console.log("  - position.totalLifetimeDepositUsd");
  console.log("  - position.depositUsedFallback");
  console.log("");
  console.log("Pool epoch cache key(s):");
  if (!poolKeys || poolKeys.length === 0)
    console.log("  (none found — only the position config will change)");
  else for (const k of poolKeys) console.log("  %s", k);
  console.log("");
  console.log("Will be cleared on the pool epoch entries:");
  console.log("  - lastNftScanBlock        (forces from-creation rescan)");
  if (flags["clear-hodl"])
    console.log("  - lifetimeHodl            (--clear-hodl was passed)");
  console.log("");
  console.log("Backups will be written to:");
  console.log("  %s.pre-rescan.<ISO>.json", CONFIG_PATH);
  if (poolKeys && poolKeys.length)
    console.log("  %s.pre-rescan.<ISO>.json", EPOCH_CACHE_PATH);
  console.log("");
}

/**
 * Prompt y/N; resolve true on `y`/`yes`, false otherwise.
 *
 * Anything other than an explicit yes is a no. This gate stands in
 * front of a destructive, irreversible edit to the operator's config,
 * so a stray newline or a piped empty stdin must abort rather than
 * proceed.
 *
 * @param {Function} [createInterface]  readline factory; injected so
 *   the prompt can be driven without a TTY.
 */
function _confirm(createInterface = readline.createInterface) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Proceed? [y/N] ", (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

/**
 * Apply the disk mutations.  Returns the timestamped backup paths.
 *
 * A backup is copied BEFORE anything is deleted, and the copy is taken
 * for each file this call will touch. That ordering is the whole
 * safety story: the fields removed here cannot be recomputed from the
 * remaining config, so an interrupted run with no backup would lose
 * them permanently.
 *
 * @param {object} cfg          Parsed bot-config (mutated in place).
 * @param {object} epochCache   Parsed epoch cache (mutated in place).
 * @param {string} posKey       Composite position key.
 * @param {string[]} poolKeys   Epoch-cache keys, possibly empty.
 * @param {object} flags        Parsed CLI flags.
 * @param {object} [paths]      `{ configPath, epochPath }` — injected
 *   so tests exercise the real copy/delete/write against fixtures
 *   instead of the operator's live files.
 */
function _applyMutations(cfg, epochCache, posKey, poolKeys, flags, paths = {}) {
  const configPath = paths.configPath || CONFIG_PATH;
  const epochPath = paths.epochPath || EPOCH_CACHE_PATH;
  const stamp = new Date().toISOString().replace(/[:]/g, "-");
  const cfgBackup = configPath + ".pre-rescan." + stamp + ".json";
  const cacheBackup = epochPath + ".pre-rescan." + stamp + ".json";
  fs.copyFileSync(configPath, cfgBackup);
  if (poolKeys && poolKeys.length) fs.copyFileSync(epochPath, cacheBackup);

  const pos = cfg.positions[posKey];
  delete pos.totalCompoundedUsd;
  delete pos.compoundHistory;
  delete pos.lastCompoundAt;
  delete pos.totalLifetimeDepositUsd;
  delete pos.depositUsedFallback;
  _writeJson(configPath, cfg);

  if (poolKeys && poolKeys.length) {
    for (const k of poolKeys) {
      delete epochCache[k].lastNftScanBlock;
      if (flags["clear-hodl"]) delete epochCache[k].lifetimeHodl;
    }
    _writeJson(epochPath, epochCache);
  }

  return {
    cfgBackup,
    cacheBackup: poolKeys && poolKeys.length ? cacheBackup : null,
  };
}

/**
 * @param {string[]} [argv]  Arguments after the node/script pair.
 * @param {object} [opts]    `{ configPath, epochPath, confirm }` —
 *   defaults reproduce the CLI exactly.
 */
async function main(argv = process.argv.slice(2), opts = {}) {
  const configPath = opts.configPath || CONFIG_PATH;
  const epochPath = opts.epochPath || EPOCH_CACHE_PATH;
  const confirm = opts.confirm || _confirm;
  const { positional, flags } = _parseArgs(argv);
  if (positional.length !== 1 || flags.help) {
    console.error(
      "Usage: node util/diagnostic/rescan-pool-history.js <tokenId>" +
        " [--wallet 0x...] [--contract 0x...]" +
        " [--blockchain pulsechain] [--token0 0x...] [--token1 0x...]" +
        " [--fee 2500] [--clear-hodl] [--yes]",
    );
    process.exit(1);
  }
  const tokenId = positional[0];
  if (!flags.blockchain) flags.blockchain = "pulsechain";

  if (!fs.existsSync(configPath)) {
    console.error("[rescan] config not found at %s", configPath);
    process.exit(2);
  }
  const cfg = _loadJson(configPath, "bot-config");
  const epochCache = fs.existsSync(epochPath)
    ? _loadJson(epochPath, "epoch-cache")
    : {};

  const posKey = _findPositionKey(cfg.positions || {}, tokenId, flags);
  const pos = cfg.positions[posKey];
  const poolKeys = _findPoolKey(epochCache, posKey, flags);

  _printPlan(posKey, pos, poolKeys, flags);

  if (!flags.yes) {
    const ok = await confirm();
    if (!ok) {
      console.log("[rescan] aborted by user");
      process.exit(0);
    }
  }

  const { cfgBackup, cacheBackup } = _applyMutations(
    cfg,
    epochCache,
    posKey,
    poolKeys,
    flags,
    { configPath, epochPath },
  );

  console.log("");
  console.log("[rescan] done.");
  console.log("  config backup:      %s", cfgBackup);
  if (cacheBackup) console.log("  epoch cache backup: %s", cacheBackup);
  console.log("");
  console.log("Restart the bot to trigger the from-creation rescan:");
  console.log("  npm run stop && npm run build-and-start");
}

/*- Gate the CLI behind require.main so a test can require this module
 *  without launching the tool — matches every other tool in
 *  util/diagnostic/ and the convention documented in
 *  docs/engineering.md § Diagnostic Utilities. */
if (require.main === module) {
  main().catch((err) => {
    console.error("[rescan] unexpected error:", err);
    process.exit(2);
  });
}

module.exports = {
  _parseArgs,
  _findPositionKey,
  _filterDescription,
  _findPoolKey,
  _writeJson,
  _loadJson,
  _printPlan,
  _confirm,
  _applyMutations,
  main,
};
