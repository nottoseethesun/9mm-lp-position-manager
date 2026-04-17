/**
 * @file test/eslint-rules/no-fetch-without-csrf.test.js
 * @description Tests for the no-fetch-without-csrf custom ESLint rule.
 */

"use strict";

const { describe, it } = require("node:test");
const { RuleTester } = require("eslint");
const rule = require("../../eslint-rules/no-fetch-without-csrf");

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

describe("no-fetch-without-csrf", () => {
  it("passes RuleTester valid/invalid cases", () => {
    ruleTester.run("no-fetch-without-csrf", rule, {
      valid: [
        // GET requests don't need CSRF
        { code: 'fetch("/api/status")' },
        { code: 'fetch("/api/status", { method: "GET" })' },

        // POST with csrfHeaders() spread in headers object
        {
          code: 'fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: "{}" })',
        },

        // DELETE with csrfHeaders() as direct headers value
        {
          code: 'fetch("/api/wallet", { method: "DELETE", headers: csrfHeaders() })',
        },

        // POST with spread among other headers
        {
          code: 'fetch("/api/rebalance", { method: "POST", headers: { ...csrfHeaders(), "Content-Type": "application/json" } })',
        },

        // Not a fetch call
        {
          code: 'notFetch("/api/config", { method: "POST" })',
        },
      ],
      invalid: [
        // POST without any headers
        {
          code: 'fetch("/api/config", { method: "POST", body: "{}" })',
          errors: [{ messageId: "missingCsrf", data: { method: "POST" } }],
        },

        // DELETE without csrfHeaders
        {
          code: 'fetch("/api/wallet", { method: "DELETE" })',
          errors: [{ messageId: "missingCsrf", data: { method: "DELETE" } }],
        },

        // POST with headers but no csrfHeaders spread
        {
          code: 'fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" } })',
          errors: [{ messageId: "missingCsrf", data: { method: "POST" } }],
        },

        // PUT without csrf
        {
          code: 'fetch("/api/data", { method: "PUT", headers: { "Content-Type": "application/json" } })',
          errors: [{ messageId: "missingCsrf", data: { method: "PUT" } }],
        },

        // Case-insensitive method match
        {
          code: 'fetch("/api/config", { method: "post", body: "{}" })',
          errors: [{ messageId: "missingCsrf", data: { method: "POST" } }],
        },
      ],
    });
  });
});
