/**
 * @file scripts/stop.js
 * @description Gracefully stop the LP Ranger server (`npm stop`).
 *
 *   Primary: read the PID from `tmp/lp-ranger.pid` (written on startup by
 *   `src/server-pid.js`) and send SIGTERM — the same clean shutdown as Ctrl+C
 *   (stops all positions, closes the HTTP server, removes the PID file). If
 *   the process is still alive after a short grace period, escalate to
 *   SIGKILL and clear the now-stale PID file.
 *
 *   Fallback: when there is no PID file (e.g. the server was started by an
 *   older build, or crashed without cleaning up), locate the `node server.js`
 *   listener on the port via lsof and signal it.
 */

"use strict";

const { log } = require("../src/log");
const { readPid, getPidFilePath, removePidFile } = require("../src/server-pid");
const { findListenerPids, psCmd } = require("./_find-process");

const PORT = Number(process.env.PORT || 5555);

/** Short sleep helper. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Send a signal to a PID; swallow errors. Returns true if delivered. */
function signalPid(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

/** True when the process is alive (signal 0 is an existence/permission probe). */
function isAlive(pid) {
  return signalPid(pid, 0);
}

/** Stop by PID: SIGTERM, then SIGKILL if it doesn't exit within ~3s. */
async function stopByPid(pid) {
  if (!isAlive(pid)) {
    log.info(
      "PID %d (from %s) is not running -- clearing stale PID file",
      pid,
      getPidFilePath(),
    );
    removePidFile();
    return;
  }
  log.info("Sending SIGTERM to PID %d -- graceful shutdown...", pid);
  signalPid(pid, "SIGTERM");
  for (let i = 0; i < 30 && isAlive(pid); i++) await sleep(100);
  if (isAlive(pid)) {
    log.info("⚠ Still running after SIGTERM -- sending SIGKILL");
    signalPid(pid, "SIGKILL");
    removePidFile();
  }
  log.info("✔ Stopped");
}

/** Fallback: find the node listener on PORT and signal it. */
async function stopByPort() {
  const pids = findListenerPids(PORT).filter((pid) => /node/.test(psCmd(pid)));
  if (pids.length === 0) {
    log.info(
      "No PID file and nothing listening on port %d -- server not running",
      PORT,
    );
    return;
  }
  for (const pid of pids) {
    log.info("Sending SIGTERM to PID %d (port %d)...", pid, PORT);
    signalPid(pid, "SIGTERM");
  }
  await sleep(1000);
  const remaining = findListenerPids(PORT);
  if (remaining.length > 0) {
    log.info("⚠ Still running -- sending SIGKILL");
    for (const pid of remaining) signalPid(pid, "SIGKILL");
  }
  log.info("✔ Stopped");
}

(async function main() {
  log.info("Stopping LP Ranger server...");
  const pid = readPid();
  if (pid !== null) {
    await stopByPid(pid);
    return;
  }
  await stopByPort();
})();
