---
name: chat-dont-askuserquestion
description: "For open-ended technical discussions the user wants plain-text chat, not AskUserQuestion multi-choice boxes. Structured options are appropriate only for narrowly-scoped, mutually-exclusive decisions the user has explicitly asked to be locked down."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d932d59e-01b4-45db-82b1-6d987abcda8f
---

When the user is in exploratory / diagnostic / "let's discuss" mode, do NOT reach for `AskUserQuestion`. Reply in plain markdown text and let the user steer the conversation. Repeated multi-choice boxes on the same topic read as forcing a decision they haven't asked to make yet.

**Why:** Session 2026-07-18, range-width-over-100 discussion. User rejected three consecutive AskUserQuestion invocations on the same topic. Third rejection was verbatim "STOP STOP STOP..." plus "I mean to chat about this". Prior clarify-rejections also asked for more prose breakdown, which I read as "expand the AskUserQuestion options" when the actual signal was "stop using AskUserQuestion at all — talk to me."

**How to apply:**
- Default to plain-text prose for anything that starts as "what do you think", "how should we", "explain more", "why is X".
- Only use `AskUserQuestion` when the user has narrowed the problem to a small enumerated set of mutually-exclusive locked-down decisions AND they've explicitly asked "pick between these" or "which do you want". Even then, one question with 2-3 options; not a batch of two questions with three-paragraph option bodies.
- If in doubt, ask ONE plain-text question at the end of the message ("Want to see option A first, or should I diagnose Dev-vs-Prod first?"), not a structured tool call.
- Watch for the rejection signal: if a clarify-rejection comes back and the user is asking for "more explanation" or "restate this", the signal is almost never "expand the question tool" — it's "we're not at the decision stage yet, keep talking."
