---
name: feedback_never_pattern_kill
description: Never pkill/pgrep -f on a pattern that appears in your own command line — the lookup matches the shell running it and kills its own caller. Kill by PORT (lsof -ti tcp:PORT) instead.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fbb9ad2b-bfb6-4113-a2f4-fcb15a7900da
  modified: 2026-08-08T23:49:29.642Z
---

# Never kill by a pattern that matches your own command

`pkill -f` and `pgrep -f` match against the **full command line** of every
process — including the shell currently running the command. If the
pattern also appears in that command, the lookup kills its own caller.

```sh
pkill -f 'scripts/show-gallery.js'   # the shell running THIS dies too
```

The symptom is a command that returns **exit code 144** (128 + SIGTERM)
with no output, looking like a mysterious crash rather than a self-inflicted
kill. It cost two debugging detours in one session before the cause was
obvious.

**Kill by port instead**, which cannot match anything but a real listener:

```sh
PID=$(lsof -ti tcp:5557 -sTCP:LISTEN | head -1)
[ -n "$PID" ] && kill "$PID"
```

In this repo, `scripts/_find-process.js` already exports
`findListenerPids(port)` for exactly this — `npm stop` and
`npm run show-gallery` both use it. Reuse it rather than shelling out.

**How to apply:**

- Killing a dev server: look it up by the port it listens on.
- If a name pattern is genuinely unavoidable, make sure it cannot match
  the current command (e.g. run it from a file whose path differs), and
  prefer `pgrep` to inspect before `kill`.
- Seeing exit 144 with no output from a command that greps or kills by
  process name? That is this bug, not a crash.
