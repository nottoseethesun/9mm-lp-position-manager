/**
 * @file dashboard-telegram.js
 * @description Telegram notification setup dialog.
 * Manages the modal for configuring bot token, chat ID, and event preferences.
 *
 * Depends on: dashboard-helpers.js (g).
 */

import { g, csrfHeaders } from "./dashboard-helpers.js";

/** POST JSON and return parsed response. */
async function _post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrfHeaders() },
    body: JSON.stringify(body),
  });
  return res.json();
}

const _EVENT_IDS = [
  "oorTimeout",
  "rebalanceSuccess",
  "rebalanceFail",
  "compoundSuccess",
  "compoundFail",
  "otherError",
  "lowGasBalance",
  "veryLowGas",
  "shutdown",
];

/** Track whether the wallet modal was open when we launched. */
let _walletWasOpen = false;

/**
 * When Telegram is configured during fresh-install wallet
 * setup, the wallet password doesn't exist yet so the server
 * can't encrypt. Stash the config here and flush it after
 * wallet confirmation via flushPendingTelegramConfig().
 */
let _pendingConfig = null;

/** Show the Telegram setup modal and load current config from server. */
export async function openTelegramModal() {
  const modal = g("telegramModal");
  if (!modal) return;
  // If the wallet setup modal is open, hide it so we appear on top
  const wm = g("walletModal");
  _walletWasOpen = wm && !wm.classList.contains("hidden");
  if (_walletWasOpen) wm.classList.add("hidden");
  modal.classList.remove("hidden");
  _setStatus("");
  /*- During the initial wallet-setup flow the server has no
   *  session password yet, so it cannot encrypt credentials.
   *  Hide Save and Test entirely to avoid presenting broken-
   *  looking disabled buttons — the values the user enters are
   *  stashed on Close and submitted automatically once wallet
   *  setup confirms (see closeTelegramModal + confirmWallet).
   *  In the Settings flow both buttons remain visible; Test is
   *  enabled/disabled by _updateTestBtn() based on config state. */
  const saveBtn = g("tgSaveBtn");
  const testBtn = g("tgTestBtn");
  if (saveBtn) saveBtn.hidden = _walletWasOpen;
  if (testBtn) testBtn.hidden = _walletWasOpen;
  if (_walletWasOpen) {
    _setStatus("Values will be saved after wallet setup completes.");
  }
  _updateTestBtn(false);
  try {
    const res = await fetch("/api/telegram/config");
    const data = await res.json();
    if (data.enabledEvents) {
      for (const id of _EVENT_IDS) {
        const el = g("tgEvt_" + id);
        if (el) el.checked = !!data.enabledEvents[id];
      }
    }
    const tokenEl = g("tgBotToken");
    const chatEl = g("tgChatId");
    if (tokenEl)
      tokenEl.placeholder = data.hasToken
        ? "(saved)"
        : "123456789:ABCdefGhI...";
    if (chatEl) chatEl.placeholder = data.hasChatId ? "(saved)" : "123456789";
    _updateTestBtn(data.configured);
    if (_walletWasOpen) {
      /*- Re-opened during wallet setup: keep the deferred-save
       *  notice; Save is still hidden and the stash/flush path
       *  will run on Close / confirmWallet. */
      _setStatus("Values will be saved after wallet setup completes.");
    } else if (_pendingConfig) {
      _setStatus("Previous save did not complete — Save again to retry.", true);
    }
  } catch {
    _setStatus("Could not load config");
  }
}

/** Close the Telegram setup modal. */
export function closeTelegramModal() {
  const modal = g("telegramModal");
  /*- Launched-from-wallet-setup flow: Save is hidden, so capture
   *  whatever the user entered now and stash it for confirmWallet
   *  to submit once the session password exists. */
  if (_walletWasOpen) _stashCurrentFormForDeferredSave();
  if (modal) modal.classList.add("hidden");
  // Restore the wallet modal if we hid it on open
  if (_walletWasOpen) {
    const wm = g("walletModal");
    if (wm) wm.classList.remove("hidden");
    _walletWasOpen = false;
  }
}

/**
 * Read the current form fields and stash a config body into
 * _pendingConfig so confirmWallet can submit it once the
 * wallet password is available. Only stashes when the user
 * actually provided a token or chat ID, to avoid overwriting
 * existing server-side config with an empty body.
 */
function _stashCurrentFormForDeferredSave() {
  const tokenEl = g("tgBotToken");
  const chatEl = g("tgChatId");
  const token = tokenEl?.value.trim();
  const chatId = chatEl?.value.trim();
  if (!token && !chatId) return;
  const body = { enabledEvents: _readEvents() };
  if (token) body.botToken = token;
  if (chatId) body.chatId = chatId;
  _pendingConfig = body;
  console.log(
    "[lp-ranger] [telegram] Credentials stashed for deferred save after wallet setup.",
  );
}

/** Read the event checkboxes and return an enabledEvents map. */
function _readEvents() {
  const events = {};
  for (const id of _EVENT_IDS) {
    const el = g("tgEvt_" + id);
    events[id] = el ? el.checked : false;
  }
  return events;
}

/** Set the status message in the modal. */
function _setStatus(msg, isError) {
  const el = g("tgStatus");
  if (!el) return;
  el.textContent = msg;
  el.className =
    "9mm-pos-mgr-mt-sm" +
    (isError ? " 9mm-pos-mgr-text-err" : " 9mm-pos-mgr-text-ok");
}

/** Enable or disable the Test button. */
function _updateTestBtn(enabled) {
  const btn = g("tgTestBtn");
  if (btn) btn.disabled = !enabled;
}

/**
 * Stash the body for deferred encryption and clear the input
 * fields so the user sees a pending state.
 */
function _stashPending(body, tokenEl, chatEl) {
  _pendingConfig = body;
  _setStatus("Saved — will be applied after wallet setup");
  if (tokenEl && body.botToken) {
    tokenEl.value = "";
    tokenEl.placeholder = "(pending)";
  }
  if (chatEl && body.chatId) {
    chatEl.value = "";
    chatEl.placeholder = "(pending)";
  }
  _updateTestBtn(false);
}

/** Apply post-save UI updates after a successful server save. */
function _applySaveSuccess(body, tokenEl, chatEl) {
  _setStatus("Saved");
  if (tokenEl) tokenEl.value = "";
  if (chatEl) chatEl.value = "";
  if (tokenEl && body.botToken) tokenEl.placeholder = "(saved)";
  if (chatEl && body.chatId) chatEl.placeholder = "(saved)";
  _updateTestBtn(true);
}

/** Save Telegram config to the server. */
async function _save() {
  const tokenEl = g("tgBotToken");
  const chatEl = g("tgChatId");
  const body = { enabledEvents: _readEvents() };
  if (tokenEl?.value.trim()) body.botToken = tokenEl.value.trim();
  if (chatEl?.value.trim()) body.chatId = chatEl.value.trim();
  _setStatus("Saving...");
  try {
    const res = await _post("/api/telegram/config", body);
    if (res.ok) {
      _applySaveSuccess(body, tokenEl, chatEl);
      return;
    }
    /*- Fresh-install path: the server has no session password yet,
     *  so it cannot encrypt. Stash the config in memory;
     *  flushPendingTelegramConfig() will submit it with the wallet
     *  password once confirmWallet() runs. */
    if (res.error === "Password required") {
      console.log(
        "[lp-ranger] [telegram] Save deferred — server has no session password yet; " +
          "will be submitted after wallet setup confirms.",
      );
      _stashPending(body, tokenEl, chatEl);
      return;
    }
    _setStatus(res.error || "Save failed", true);
  } catch (err) {
    _setStatus(err.message, true);
  }
}

/**
 * Flush any Telegram config that was stashed during the
 * wallet setup dialog. Called by confirmWallet() once the
 * wallet password is available so the server can encrypt.
 *
 * On failure the pending config is retained so a later
 * openTelegramModal() can detect it and offer a retry. Both
 * success and failure are logged to the browser console so
 * the user can see what happened without reopening the modal.
 *
 * @param {string} password - the wallet password from setup.
 */
export async function flushPendingTelegramConfig(password) {
  if (!_pendingConfig) return;
  const body = { ..._pendingConfig, password };
  try {
    const res = await _post("/api/telegram/config", body);
    if (res && res.ok) {
      _pendingConfig = null;
      console.log(
        "[lp-ranger] [telegram] Deferred credentials saved after wallet setup.",
      );
      return;
    }
    console.warn(
      "[lp-ranger] [telegram] Deferred save REJECTED by server — credentials NOT saved:",
      res?.error || "(no error message)",
      "Re-open Telegram Setup to retry.",
    );
  } catch (err) {
    console.warn(
      "[lp-ranger] [telegram] Deferred save FAILED — credentials NOT saved:",
      err.message,
      "Re-open Telegram Setup to retry.",
    );
  }
}

/** Send a test notification. */
async function _test() {
  _setStatus("Sending test...");
  try {
    const res = await _post("/api/telegram/test", {});
    _setStatus(res.ok ? "Test sent!" : res.error || "Test failed", !res.ok);
  } catch (err) {
    _setStatus(err.message, true);
  }
}

/** Wire up all Telegram-related event listeners. */
export function initTelegram() {
  const saveBtn = g("tgSaveBtn");
  const testBtn = g("tgTestBtn");
  const closeBtn = g("tgCloseBtn");
  if (saveBtn) saveBtn.addEventListener("click", _save);
  if (testBtn) testBtn.addEventListener("click", _test);
  if (closeBtn) closeBtn.addEventListener("click", closeTelegramModal);

  const settingsBtn = g("telegramSettingsBtn");
  if (settingsBtn) settingsBtn.addEventListener("click", openTelegramModal);

  for (const btn of document.querySelectorAll(".setupTelegramBtn")) {
    btn.addEventListener("click", openTelegramModal);
  }

  const modal = g("telegramModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeTelegramModal();
    });
  }
}
