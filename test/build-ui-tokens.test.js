/**
 * @file test/build-ui-tokens.test.js
 * @description
 * Covers the JSON→CSS bridge for dashboard layout tokens.
 *
 * The info-dialog max height is configured in `ui-defaults.json` but has
 * to reach a stylesheet, and this project forbids inline styles — so
 * `scripts/build-ui-tokens.js` bakes it into a generated
 * `public/ui-tokens.css` at build time. That is three moving parts (the
 * JSON key, the generator, the `var()` reference in the authored CSS)
 * and a break in any one of them fails the same silent way: `var()`
 * with no fallback makes `max-height` invalid at computed-value time,
 * which is `max-height: none` — dialogs quietly grow again and push
 * their Close button off-screen. Nothing visible would report it.
 *
 * These tests check each joint of that chain rather than the generator
 * alone.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { readPxToken, renderCss } = require("../scripts/build-ui-tokens");

const ROOT = path.join(__dirname, "..");
const UI_DEFAULTS = path.join(
  ROOT,
  "app-config",
  "app-defaults-for-user-configurable",
  "ui-defaults.json",
);
const AUTHORED_CSS = path.join(ROOT, "public", "9mm-pos-mgr.css");
const INDEX_HTML = path.join(ROOT, "public", "index.html");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

/* ---------- the JSON key ---------- */

test("ui-defaults.json ships infoDialogMaxHeightPx as a positive integer", () => {
  const v = readJson(UI_DEFAULTS).infoDialogMaxHeightPx;
  assert.equal(typeof v, "number");
  assert.ok(Number.isInteger(v) && v > 0, `not a pixel count: ${v}`);
});

test("the shipped key carries its own explanatory comment", () => {
  /*- Every other tunable in this directory documents itself in-file;
   *  this one especially, because it is the single key here that is NOT
   *  a localStorage-backed preference. */
  assert.ok(readJson(UI_DEFAULTS)._infoDialogMaxHeightPx_comment);
});

/* ---------- the generator ---------- */

test("readPxToken returns a valid value unchanged", () => {
  assert.equal(readPxToken({ x: 650 }, "x"), 650);
});

test("readPxToken rejects anything that is not a positive integer", () => {
  for (const bad of [undefined, null, 0, -1, 12.5, "650", NaN, Infinity, {}]) {
    assert.throws(
      () => readPxToken({ x: bad }, "x"),
      /positive integer/,
      `${JSON.stringify(bad)} must be rejected, not silently emitted`,
    );
  }
});

test("readPxToken names the offending key so the build error is actionable", () => {
  assert.throws(() => readPxToken({}, "infoDialogMaxHeightPx"), {
    message: /infoDialogMaxHeightPx/,
  });
});

test("renderCss emits the custom property with a px unit", () => {
  const css = renderCss({ infoDialogMaxHeightPx: 650 });
  assert.match(css, /--info-dialog-max-h:\s*650px;/);
  assert.match(css, /:root\s*\{/);
});

test("renderCss emits no style rules — values only", () => {
  /*- The generated file must never grow into a place where styles are
   *  authored; rules belong beside their neighbours in the real
   *  stylesheets. */
  const css = renderCss({ infoDialogMaxHeightPx: 650 });
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = withoutComments.match(/[^{}]+\{/g) || [];
  assert.deepEqual(
    selectors.map((s) => s.trim()),
    [":root {"],
    "only :root may appear",
  );
});

test("renderCss warns the reader not to hand-edit", () => {
  assert.match(renderCss({ infoDialogMaxHeightPx: 1 }), /GENERATED FILE/);
});

/* ---------- the consuming CSS ---------- */

test("the info-dialog rule consumes the token", () => {
  const css = fs.readFileSync(AUTHORED_CSS, "utf8");
  assert.match(
    css,
    /max-height:\s*min\(var\(--info-dialog-max-h\)/,
    "the modal-help rule must bound its height from the token",
  );
});

test("the token is referenced with NO fallback literal", () => {
  /*- A fallback would be a second copy of the shipped default, which is
   *  exactly what routing it through JSON was meant to avoid. */
  const css = fs.readFileSync(AUTHORED_CSS, "utf8");
  assert.equal(
    /var\(--info-dialog-max-h\s*,/.test(css),
    false,
    "var(--info-dialog-max-h, <fallback>) would duplicate the JSON value",
  );
});

test("the bounded rule targets the info-dialog class, so both dialogs get it", () => {
  /*- tplParamHelpModal and tplPnlBreakdownModal both carry
   *  `9mm-pos-mgr-modal-help`; bounding that class covers both without
   *  touching the tool or warning modals. */
  const css = fs.readFileSync(AUTHORED_CSS, "utf8");
  const idx = css.indexOf("--info-dialog-max-h");
  const rule = css.slice(0, idx);
  const lastSelector = rule.slice(rule.lastIndexOf("}") + 1);
  assert.match(lastSelector, /modal-help/);
});

test("the modal body is set up to scroll inside the bounded dialog", () => {
  /*- The cap only produces internal scrolling because the body already
   *  carries overflow-y:auto and flex:1/min-height:0.  If those were
   *  dropped, the cap would clip content instead of scrolling it. */
  const css = fs.readFileSync(AUTHORED_CSS, "utf8");
  const start = css.indexOf("mm-pos-mgr-modal-body {");
  const body = css.slice(start, css.indexOf("}", start));
  assert.match(body, /overflow-y:\s*auto/);
  assert.match(body, /min-height:\s*0/);
});

/* ---------- the page wiring ---------- */

test("index.html links the generated stylesheet", () => {
  const html = fs.readFileSync(INDEX_HTML, "utf8");
  assert.match(html, /<link rel="stylesheet" href="ui-tokens\.css/);
});

test("the generated file is gitignored, not committed", () => {
  /*- It is build output; a committed copy would drift from the JSON. */
  const ignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.match(ignore, /^public\/ui-tokens\.css$/m);
});

test("the build runs the generator before bundling", () => {
  const pkg = readJson(path.join(ROOT, "package.json"));
  const build = pkg.scripts.build;
  assert.match(build, /build-ui-tokens\.js/);
  assert.ok(
    build.indexOf("build-ui-tokens.js") < build.indexOf("cache-bust.js"),
    "the file must exist before cache-bust stamps its link",
  );
});

test("prelint generates the stylesheet so lint sees it in CI too", () => {
  /*- `stylelint public/*.css` only lints files that exist.  Without
   *  this, the generated file would be linted on a developer's machine
   *  (where a build has run) and silently skipped in CI, which is the
   *  asymmetry that lets a generator start emitting invalid CSS
   *  unnoticed. */
  const pkg = readJson(path.join(ROOT, "package.json"));
  assert.match(pkg.scripts.prelint, /build-ui-tokens\.js/);
});

test("cache-bust stamps the generated stylesheet", () => {
  /*- Regenerated on every build, so a browser holding the old copy
   *  would keep a stale --info-dialog-max-h after an operator edits the
   *  JSON. */
  const src = fs.readFileSync(
    path.join(ROOT, "scripts", "cache-bust.js"),
    "utf8",
  );
  assert.match(src, /ui-tokens\.css\?v=/);
});
