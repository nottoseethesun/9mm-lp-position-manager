---
name: feedback_release_notes_style
description: Release notes need an Overview section naming the release after a Texas Ranger plus a one-line summary; every change states its user-visible consequence; technical bullets carry a category label and spell out causal links and payoffs. American spelling.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fbb9ad2b-bfb6-4113-a2f4-fcb15a7900da
  modified: 2026-08-08T23:32:19.052Z
---

# Writing release notes

Derived from the user's own edits to the 0.9 notes on 2026-08-08 —
compare what was drafted against what shipped:
<https://github.com/nottoseethesun/lp-ranger/releases/tag/0.9>

The structure I proposed was kept (Highlights → themed sections →
Technical at the bottom, under 200 words). Six things were changed, and
they are the pattern to follow.

## 1. Open with an Overview section

Every release gets an `## Overview` before Highlights, containing two
things:

- **A namesake line.** Releases are named after **notable, honorable
  gunslingers of the Old West**, Texas included but not limited to it —
  NOT Texas Rangers specifically, though a namesake may happen to have
  been one. 0.9 was "Williamson was the first official Texas Ranger,
  guardian of the Lone Star State." The line names the figure and says
  in one clause why they are remembered.

  "Honorable" is a real criterion, not decoration: the theme is the
  admirable side of the Old West, matching the project's identity (the
  README tagline, the tooled-leather crest, the Lone Star). Outlaws and
  killers do not qualify however famous.
- **A one-line summary of the release's character.** 0.9's was "Last
  couple stylistic (visual-only) items for dialogs, and an updated
  Screenshot Gallery." It tells an operator whether this release affects
  behavior at all.

Do NOT invent the namesake — propose the section and ask which Ranger, or
leave a clear placeholder. The name is the user's call.

## 2. Say what the change does FOR the reader

Not just what changed. The Close-button bullet gained "which was taking
up too much vertical space" — the reason it mattered. A change without a
consequence reads as churn.

## 3. Label technical bullets by category

"Close button pinned to the dialog box" became "**Dialog layout:** Close
button pinned…". The label lets a reader skip or seek by area.

## 4. Spell out causal links

An em-dash joining cause and effect was replaced with "since": "`line-height: 0`
**, since** at any positive value it made the paragraph's first line
taller". Related: [[feedback_prose_style]] favors a period or an explicit
connective over an em-dash continuation.

## 5. Name things fully

"New `npm run show-gallery` previews the Pages site" became "New
`npm run show-gallery` **project command** **builds and** previews". Say
what kind of thing it is and everything it does.

## 6. State the payoff

The shared-builder bullet gained "avoiding any duplication of logic".
Having explained a mechanism, say what it buys.

## Also

- American spelling — see [[feedback_prose_style]].
- Prepend `docs/release-notes-header.md` — see
  [[reference_release_notes_header]].
- Scope the notes from the latest non-`v` tag; `--sort=-v:refname` puts
  legacy `v0.2.x` tags on top, see [[project_tag_format_no_v]].
