#!/usr/bin/env node
/**
 * @file scripts/format.js
 * @description
 * Runs Prettier over the canonical JS target list from
 * `scripts/lint-targets.js`.  Backs both `npm run format` (`--write`)
 * and `npm run format:check` (`--check`).
 *
 * Why a script rather than an inline npm script: the target list is
 * long enough that inlining it pushed both npm scripts past the
 * project's 100-character threshold, and — more to the point —
 * inlining meant the list was duplicated per script.  Here it is
 * imported once, so `format` and `format:check` can never cover
 * different files.
 *
 * Usage:
 *   node scripts/format.js --check   # verify, non-zero exit if dirty
 *   node scripts/format.js --write   # rewrite in place
 *
 * Exit codes:
 *   0 — clean (or rewritten successfully)
 *   1 — bad arguments
 *   Prettier's own exit code otherwise (1 when --check finds drift)
 */

"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const { JS_TARGETS } = require("./lint-targets");

const ROOT = path.resolve(__dirname, "..");

/** Resolve a binary from node_modules/.bin — never `npx`. */
function bin(name) {
  return path.join(ROOT, "node_modules", ".bin", name);
}

function main() {
  const mode = process.argv[2];
  if (mode !== "--check" && mode !== "--write") {
    console.error("usage: node scripts/format.js --check|--write");
    process.exit(1);
  }
  const res = spawnSync(bin("prettier"), [mode, ...JS_TARGETS], {
    cwd: ROOT,
    stdio: "inherit",
  });
  process.exit(res.status === null ? 1 : res.status);
}

main();
