/**
 * @file eslint-rules/no-fetch-without-csrf.js
 * @description ESLint rule that flags `fetch()` calls with a mutating HTTP
 * method (POST, DELETE, PUT, PATCH) whose headers don't include a
 * `...csrfHeaders()` spread.  Ensures every mutating request carries a
 * CSRF token.
 *
 * Only applies to dashboard ES module files where `csrfHeaders` is available.
 */

"use strict";

/** HTTP methods that require a CSRF token. */
const MUTATING = new Set(["POST", "DELETE", "PUT", "PATCH"]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require csrfHeaders() spread in fetch() calls with mutating HTTP methods",
    },
    schema: [],
    messages: {
      missingCsrf:
        "fetch() with method {{method}} must include ...csrfHeaders() in its headers.",
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!_isFetchCall(node)) return;
        const opts = node.arguments[1];
        if (!opts || opts.type !== "ObjectExpression") return;

        const method = _getMethodValue(opts);
        if (!method || !MUTATING.has(method.toUpperCase())) return;

        if (_hasCsrfSpread(opts)) return;

        context.report({
          node,
          messageId: "missingCsrf",
          data: { method: method.toUpperCase() },
        });
      },
    };
  },
};

/** True when the call is `fetch(...)`. */
function _isFetchCall(node) {
  return node.callee.type === "Identifier" && node.callee.name === "fetch";
}

/** Extract the `method` string from the options object, if present. */
function _getMethodValue(optsNode) {
  for (const prop of optsNode.properties) {
    if (prop.type !== "Property") continue;
    const key = prop.key.name || prop.key.value;
    if (key === "method" && prop.value.type === "Literal") {
      return prop.value.value;
    }
  }
  return null;
}

/** True when the `headers` property contains `...csrfHeaders()`. */
function _hasCsrfSpread(optsNode) {
  for (const prop of optsNode.properties) {
    if (prop.type !== "Property") continue;
    const key = prop.key.name || prop.key.value;
    if (key !== "headers") continue;
    const val = prop.value;
    if (val.type !== "ObjectExpression") continue;
    for (const hProp of val.properties) {
      if (
        hProp.type === "SpreadElement" &&
        hProp.argument.type === "CallExpression" &&
        hProp.argument.callee.type === "Identifier" &&
        hProp.argument.callee.name === "csrfHeaders"
      ) {
        return true;
      }
    }
    return false;
  }
  // No headers property at all — also covers `{ method: "DELETE" }` with
  // `headers: csrfHeaders()` (direct assignment, not object with spread).
  // Check for headers as a direct csrfHeaders() call.
  for (const prop of optsNode.properties) {
    if (prop.type !== "Property") continue;
    const key = prop.key.name || prop.key.value;
    if (key !== "headers") continue;
    const val = prop.value;
    return (
      val.type === "CallExpression" &&
      val.callee.type === "Identifier" &&
      val.callee.name === "csrfHeaders"
    );
  }
  return false;
}
