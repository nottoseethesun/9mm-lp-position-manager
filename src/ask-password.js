/**
 * @file src/ask-password.js
 * @description Interactive password prompt on stdin. Shared by server.js
 * (--headless mode) and bot.js (headless bot). Writes the prompt to
 * stderr so stdout stays clean for piped output.
 */

"use strict";

const readline = require("readline");

/**
 * Prompt for a password on stdin.
 * @param {string} prompt  Text to display on stderr.
 * @returns {Promise<string>}  The entered password.
 */
function askPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });
    process.stderr.write(prompt);
    rl.question("", (answer) => {
      rl.close();
      process.stderr.write("\n");
      resolve(answer);
    });
  });
}

module.exports = { askPassword };
