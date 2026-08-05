#!/usr/bin/env node
/**
 * @file scripts/audit.js
 * @description
 * Runs the two security passes over the canonical target lists from
 * `scripts/lint-targets.js`.  Backs `npm run audit:security`
 * (`--security`) and `npm run audit:secrets` (`--secrets`).
 *
 * Why a script rather than inline npm scripts: both target lists were
 * previously spelled out twice — once in the npm script and once
 * inside `scripts/check.js` — and both copies had drifted.  `check.js`
 * omitted `util/` from each, so `npm run check` security-linted 155
 * files while `npm run audit:security` covered 178, and the secret
 * scanner never looked at `util/` at all under the gate CI runs.
 * Importing the lists here means the standalone command and the gate
 * cannot disagree.
 *
 * Usage:
 *   node scripts/audit.js --security
 *   node scripts/audit.js --secrets
 *
 * Exit codes:
 *   0 — clean
 *   1 — bad arguments
 *   the underlying tool's exit code otherwise
 */

"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const { SECURITY_TARGETS, SECRET_TARGETS } = require("./lint-targets");

const ROOT = path.resolve(__dirname, "..");

/** Resolve a binary from node_modules/.bin — never `npx`. */
function bin(name) {
  return path.join(ROOT, "node_modules", ".bin", name);
}

function main() {
  const mode = process.argv[2];
  let cmd;
  let args;
  if (mode === "--security") {
    cmd = bin("eslint");
    args = [
      "-c",
      "eslint-security.config.js",
      ...SECURITY_TARGETS,
      "--max-warnings",
      "0",
    ];
  } else if (mode === "--secrets") {
    cmd = bin("secretlint");
    args = [...SECRET_TARGETS];
  } else {
    console.error("usage: node scripts/audit.js --security|--secrets");
    process.exit(1);
  }
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
  process.exit(res.status === null ? 1 : res.status);
}

main();
