/**
 * @file stylelint-rules/no-linebreak-after-escape.js
 * @description stylelint rule rejecting a CSS character escape that sits at
 * the end of a line.
 *
 * Why this rule exists:
 *   A class name starting with a digit has to escape that digit, so the
 *   class `9mm-pos-mgr-foo` is written `.\39 mm-pos-mgr-foo`.  The single
 *   space after `\39` is the escape's terminator, and `mm-pos-mgr-foo`
 *   continues the very same identifier.
 *
 *   When a formatter wraps such a selector so the line ends immediately
 *   after `\39`, the newline gets consumed as the terminator instead.  The
 *   identifier truncates to `9`, and the next line's indentation turns into
 *   a descendant combinator — so this:
 *
 *       .\39
 *         mm-pos-mgr-toggle-track::after
 *
 *   parses as `.9 mm-pos-mgr-toggle-track::after`, which matches nothing.
 *   Nothing anywhere fails: stylelint passes, Prettier passes, the tests
 *   pass, and only the browser reveals that the rule stopped applying.  The
 *   Privacy Mode and browser toggle knobs sat frozen in the off position
 *   for exactly this reason, while their track colour — a short enough rule
 *   to escape wrapping — kept working, which is what made it look like a
 *   behavioural bug rather than a formatting one.
 *
 *   The six-digit escape form, `\000039mm-pos-mgr-foo`, needs no whitespace
 *   terminator and so survives any wrap.  This rule makes the broken form
 *   fail the lint gate instead of the UI.
 *
 *   Note it flags only escapes that a line break has *already* broken, not
 *   every `\39 ` in the stylesheet.  The short-line spelling is correct CSS
 *   and the file is full of it; only the wrapped form is a defect.
 *
 * @see ../../bug-reports-on-dependencies/prettier-css-hex-escape-linewrap
 *      for the upstream Prettier 3.9.5 repro this guards against.
 */

"use strict";

const stylelint = require("stylelint");

/** Namespaced rule name, matching the `9mm` ESLint plugin's convention. */
const ruleName = "9mm/no-linebreak-after-escape";

/** Message factory for this rule's single violation type. */
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (escape) =>
    `Line break directly after the CSS escape "${escape}" — the newline is ` +
    `eaten as the escape's terminator, silently truncating the identifier ` +
    `and turning the rest of the name into a descendant type selector. ` +
    `Write the escape with six hex digits instead (e.g. ` +
    `"\\000039mm-pos-mgr-foo"), which needs no trailing-whitespace ` +
    `terminator and therefore survives any line wrap.`,
});

/** Rule metadata surfaced by stylelint (`--report-descriptionless-disables`). */
const meta = {
  url: "https://drafts.csswg.org/css-syntax/#consume-escaped-code-point",
};

/*- A CSS character escape (1–6 hex digits) that a line break immediately
 *  follows.  Trailing horizontal whitespace is allowed for, since a stray
 *  space before the newline breaks the identifier just as thoroughly.
 *
 *  Six-digit escapes are matched too: `\000039` is only safe when the
 *  identifier continues on the same line, and the spec consumes a following
 *  whitespace character regardless of how many hex digits preceded it. */
const ESCAPE_AT_LINE_END = /\\[\da-f]{1,6}[ \t]*\r?\n/gi;

/**
 * Report every escape-before-linebreak occurrence within one source string.
 *
 * @param {string} text Selector or at-rule prelude exactly as authored.
 * @param {number} offset Index of `text` within its node's source string.
 * @param {import('postcss').Node} node Node that `text` was taken from.
 * @param {import('stylelint').PostcssResult} result stylelint result object.
 * @returns {void}
 */
function reportBrokenEscapes(text, offset, node, result) {
  for (const match of text.matchAll(ESCAPE_AT_LINE_END)) {
    /*- Trim the terminator back off so the message and the highlighted
     *  range name the escape itself, not the whitespace that ate it. */
    const escape = match[0].replace(/\s+$/, "");
    const index = offset + match.index;

    stylelint.utils.report({
      message: messages.rejected(escape),
      node,
      index,
      endIndex: index + escape.length,
      result,
      ruleName,
    });
  }
}

/**
 * Build the stylelint rule function.
 *
 * @param {boolean} primary Primary option — `true` enables the rule.
 * @returns {Function} PostCSS-style walker invoked by stylelint.
 */
const ruleFunction = (primary) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true],
  });
  if (!validOptions) return;

  root.walkRules((rule) => {
    /*- `raws.selector.raw` holds the text as authored whenever it differs
     *  from the cleaned value (e.g. when comments sit inside the
     *  selector); `selector` is already the raw text otherwise. */
    const selector = rule.raws.selector?.raw ?? rule.selector;
    reportBrokenEscapes(selector, 0, rule, result);
  });

  root.walkAtRules((atRule) => {
    const params = atRule.raws.params?.raw ?? atRule.params;
    /*- stylelint indexes at-rule reports from the `@`, so skip past the
     *  name and the whitespace separating it from the prelude. */
    const offset =
      1 + atRule.name.length + (atRule.raws.afterName ?? "").length;
    reportBrokenEscapes(params, offset, atRule, result);
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

/*- `createPlugin` returns `{ ruleName, rule }`; the messages ride along on
 *  `rule.messages` for tests to assert against. */
module.exports = stylelint.createPlugin(ruleName, ruleFunction);
