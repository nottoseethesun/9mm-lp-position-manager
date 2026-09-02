/**
 * @file scripts/build-manual-content.js
 * @description Renders the shared help copy from
 * `public/shared-help-content.json` into `public/help-and-user-manual.html`,
 * between per-entry marker comments.
 *
 * Single source of truth for the shared copy: the JSON.  Two consumers
 * read it and neither holds its own wording:
 *
 *   - `public/param-help-content.js` imports it for the in-app circle-i
 *     dialog (esbuild inlines the JSON into the bundle);
 *   - this script writes it into the User Manual, which the app serves
 *     at `/help-and-user-manual.html` and which GitHub Pages publishes.
 *     That published page is what the Telegram alert links to.
 *
 * Rewriting the HTML in place — rather than generating a separate
 * artifact the way `build-disclosure-content.js` does — is deliberate:
 * the manual is a hand-written document that the Pages build copies
 * verbatim, so the rendered section has to live in the file itself.
 *
 * Marker contract, per entry key:
 *
 *     <!-- HELP:inIlGuard:START -->
 *     ...generated, do not edit...
 *     <!-- HELP:inIlGuard:END -->
 *
 * Everything between the markers is replaced on every build.  A key in
 * the JSON with no markers in the HTML is an error, not a silent skip —
 * that combination means someone added shared copy expecting it to
 * appear in the manual and it never would.
 *
 * Idempotent: running twice produces the same file.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { log } = require("../src/log");

const JSON_SRC = path.join(
  __dirname,
  "..",
  "public",
  "shared-help-content.json",
);
const HTML = path.join(__dirname, "..", "public", "help-and-user-manual.html");

/**
 * Render one shared entry as the body of a manual section.
 *
 * `heading` becomes an `<h3>` and `body` is emitted as-is — it already
 * carries the same inline HTML the dialog renders, which is what keeps
 * the two presentations identical rather than merely similar.
 *
 * @param {{manualHeading: string, manualAnchor: string,
 *          sections: {heading: string, body: string}[]}} entry
 * @returns {string}
 */
function renderEntry(entry) {
  const lines = [
    `  <h2 id="${entry.manualAnchor}">${entry.manualHeading}</h2>`,
    "  <!-- Generated from public/shared-help-content.json by",
    "       scripts/build-manual-content.js. Do not edit between the",
    "       markers; edit the JSON. -->",
  ];
  for (const s of entry.sections) {
    lines.push(`  <h3>${s.heading}</h3>`);
    lines.push(`  <p>${s.body}</p>`);
  }
  return lines.join("\n");
}

/**
 * Replace the marked region for one key.  Throws when the markers are
 * absent or malformed — see the file header on why this is not a skip.
 * @param {string} html
 * @param {string} key
 * @param {string} rendered
 * @returns {string}
 */
function replaceRegion(html, key, rendered) {
  const start = `<!-- HELP:${key}:START -->`;
  const end = `<!-- HELP:${key}:END -->`;
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i === -1 || j === -1 || j < i)
    throw new Error(
      `help-and-user-manual.html is missing a well-formed ${start} … ${end} region`,
    );
  return (
    html.slice(0, i + start.length) + "\n" + rendered + "\n  " + html.slice(j)
  );
}

/**
 * The keys of `data` that are help entries.
 *
 * Selected by SHAPE — an object carrying a `sections` array — not by a
 * naming convention.  The file also holds `_comment` keys and
 * `manualBaseUrl`, and an earlier "everything not underscore-prefixed"
 * filter swept `manualBaseUrl` in and crashed the build the moment it
 * was added.  Shape cannot drift the way a prefix rule can.
 *
 * @param {object} data  Parsed shared-help-content.json.
 * @returns {string[]}
 */
function helpKeys(data) {
  return Object.keys(data).filter(
    (k) =>
      data[k] && typeof data[k] === "object" && Array.isArray(data[k].sections),
  );
}

/** Render every shared entry into the manual.  Returns the entry count. */
function build() {
  const data = JSON.parse(fs.readFileSync(JSON_SRC, "utf8"));
  let html = fs.readFileSync(HTML, "utf8");
  const keys = helpKeys(data);
  for (const key of keys)
    html = replaceRegion(html, key, renderEntry(data[key]));
  fs.writeFileSync(HTML, html);
  return keys.length;
}

if (require.main === module) {
  const n = build();
  log.info(
    "[build-manual-content] rendered %d shared help entr%s into %s",
    n,
    n === 1 ? "y" : "ies",
    path.relative(path.join(__dirname, ".."), HTML),
  );
}

module.exports = { build, helpKeys, renderEntry, replaceRegion };
