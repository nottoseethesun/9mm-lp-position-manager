---
name: feedback-user-launches-app
description: "User always launches the app themselves during manual testing so they know exactly what they are testing. Don't offer to run `npm start` for them."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

Never offer to run `npm start` (or any app launcher) for the user during manual testing. The user always launches the app themselves.

**Why:** The user's stated reason: "I always launch so I know what I am testing." Launching personally means they control the exact commit / build / env they exercise; offering to do it for them is noise.

**How to apply:** After a change is ready for manual verification, describe what to look for (specific UI rows, log lines, refresh behavior). Do not add "Want me to launch it?" or similar. The user will run the app themselves; wait for observations.
