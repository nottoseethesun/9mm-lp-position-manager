/**
 * @file scripts/lint-targets.js
 * @description
 * Single source of truth for which JavaScript files the lint and format
 * gates apply to.
 *
 * Why this file exists:
 *   The same list used to be spelled out in four places — the `format`
 *   and `format:check` npm scripts, a hard-coded copy inside
 *   `scripts/check.js`, and (broadest of all, as bare `*.js`) the
 *   `lint-staged` config that the pre-commit hook ran.  Four copies
 *   meant four chances to drift, and they had already drifted: the
 *   pre-commit hook formatted every `*.js` in the repo while
 *   `npm run lint` checked none of them, so JS formatting was written
 *   on commit but never verified by the master command.
 *
 *   Everything that needs the list now imports it from here, and the
 *   pre-commit hook runs `npm run lint` rather than defining its own
 *   parallel set of checks.
 *
 * Keep in lockstep with the ESLint invocation in the `lint` npm script:
 * a file that ESLint checks but Prettier does not (or vice versa) is
 * the drift this file exists to prevent.  `test/eslint-rules/` and
 * `util/diagnostic/test/` are covered by the `test/**` and `util/**`
 * globs respectively.
 */

"use strict";

/**
 * Prettier-style globs for every JS file under lint/format gates.
 * Order matches the ESLint target list in the `lint` npm script.
 * @type {string[]}
 */
const JS_TARGETS = [
  "src/**/*.js",
  "test/**/*.js",
  "scripts/**/*.js",
  "util/**/*.js",
  "server.js",
  "bot.js",
  "public/dashboard-*.js",
  "eslint-rules/**/*.js",
  "stylelint-rules/**/*.js",
];

/**
 * Targets for the security ESLint pass (`eslint-security.config.js`).
 *
 * Deliberately narrower than JS_TARGETS: it covers shipped runtime and
 * operator tooling, not test fixtures or browser code.  Directory form,
 * because that is what the security config's own `files` globs expect.
 *
 * `util/` belongs here — these tools read operator config and hit RPC
 * endpoints, so they are exactly the code the security rules exist for.
 * `scripts/check.js` used to omit it, security-linting 155 files while
 * `npm run audit:security` covered 178.
 * @type {string[]}
 */
const SECURITY_TARGETS = ["src/", "scripts/", "util/", "server.js", "bot.js"];

/**
 * Targets for the secret scanner.  Same scope as SECURITY_TARGETS plus
 * the config surfaces where a credential is most likely to be
 * committed by accident.  Glob form, because secretlint does its own
 * expansion.
 * @type {string[]}
 */
const SECRET_TARGETS = [
  "src/**/*.js",
  "scripts/**/*.js",
  "util/**/*.js",
  "server.js",
  "bot.js",
  ".env*",
  "*.json",
];

module.exports = { JS_TARGETS, SECURITY_TARGETS, SECRET_TARGETS };
