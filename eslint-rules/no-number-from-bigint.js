/**
 * @file eslint-rules/no-number-from-bigint.js
 * @description ESLint rule that flags Number(), parseFloat(),
 * parseInt(), or unary + on variables whose names suggest they
 * hold EVM token amounts (amount, balance, liquidity, reserve,
 * deposit, fee, total, value0, value1).
 *
 * JavaScript Number has 53 bits of integer precision. Token
 * amounts in 18-decimal EVM tokens routinely exceed 2^53,
 * causing silent truncation. Use BigInt arithmetic instead.
 */

'use strict';

// Only flag variables that clearly hold raw on-chain BigInt token amounts.
// Exclude: fee (small integers), value (generic), amount in display contexts.
const AMOUNT_NAMES = /^(liquidity|rawBalance|reserve[s]?|weiAmount)$/i;
const CONVERT_FNS = new Set(['Number', 'parseFloat', 'parseInt']);

/** Check if a node looks like a token amount variable. */
function isAmountName(node) {
  if (node.type === 'Identifier')
    return AMOUNT_NAMES.test(node.name);
  if (node.type === 'MemberExpression')
    return isAmountName(node.property);
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Number/parseFloat/parseInt on token amount variables (precision loss)',
    },
    schema: [],
    messages: {
      precision:
        'Do not convert "{{name}}" to Number — token amounts exceed 53-bit precision. Use BigInt.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const c = node.callee;
        if (c.type !== 'Identifier' || !CONVERT_FNS.has(c.name))
          return;
        const arg = node.arguments[0];
        if (arg && isAmountName(arg)) {
          context.report({
            node,
            messageId: 'precision',
            data: {
              name: arg.type === 'Identifier'
                ? arg.name
                : context.sourceCode.getText(arg),
            },
          });
        }
      },
      UnaryExpression(node) {
        if (node.operator !== '+') return;
        if (isAmountName(node.argument)) {
          context.report({
            node,
            messageId: 'precision',
            data: {
              name: node.argument.type === 'Identifier'
                ? node.argument.name
                : context.sourceCode.getText(node.argument),
            },
          });
        }
      },
    };
  },
};
