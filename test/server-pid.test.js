/**
 * @file test/server-pid.test.js
 * @description Tests for src/server-pid.js — write / read / remove the PID
 *   file using a temp path, so the real tmp/lp-ranger.pid is never touched.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  writePidFile,
  removePidFile,
  readPid,
  getPidFilePath,
} = require("../src/server-pid");

function _tmpPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lp-ranger-pid-"));
  return path.join(dir, "lp-ranger.pid");
}

test("writePidFile writes the current PID; readPid reads it back", () => {
  const p = _tmpPath();
  assert.strictEqual(writePidFile({ filePath: p }), true);
  assert.strictEqual(readPid({ filePath: p }), process.pid);
  assert.ok(fs.readFileSync(p, "utf8").includes(String(process.pid)));
});

test("removePidFile deletes the file; readPid then returns null", () => {
  const p = _tmpPath();
  writePidFile({ filePath: p });
  assert.strictEqual(removePidFile({ filePath: p }), true);
  assert.ok(!fs.existsSync(p));
  assert.strictEqual(readPid({ filePath: p }), null);
});

test("removePidFile is a safe no-op when the file is missing", () => {
  const p = _tmpPath(); // never written
  assert.strictEqual(removePidFile({ filePath: p }), false);
});

test("readPid returns null for a missing or malformed file", () => {
  assert.strictEqual(readPid({ filePath: _tmpPath() }), null);
  const bad = _tmpPath();
  fs.writeFileSync(bad, "not-a-pid\n");
  assert.strictEqual(readPid({ filePath: bad }), null);
});

test("readPid rejects zero and negative PIDs", () => {
  const zero = _tmpPath();
  fs.writeFileSync(zero, "0\n");
  assert.strictEqual(readPid({ filePath: zero }), null);
  const neg = _tmpPath();
  fs.writeFileSync(neg, "-5\n");
  assert.strictEqual(readPid({ filePath: neg }), null);
});

test("getPidFilePath returns an absolute path ending in lp-ranger.pid", () => {
  const p = getPidFilePath();
  assert.ok(path.isAbsolute(p));
  assert.strictEqual(path.basename(p), "lp-ranger.pid");
});
