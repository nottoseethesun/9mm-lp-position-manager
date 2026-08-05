"use strict";

/**
 * @file test/dashboard-token-decimals-sync.test.js
 * @description
 * The manual token-decimals override in Pool Details must stay quiet
 * until the position has synced.
 *
 * Reported during 0.8.15 burn-in: Pool Details claimed the decimals for
 * both tokens "couldn't be read on-chain" while the position was still
 * syncing, and told the operator to type the correct value in. Nothing
 * had failed. The decimals come from `status.poolState`, which does not
 * exist before the first pool poll, so every token failed the validity
 * check and every position showed the red notice while it synced.
 *
 * Two absences had collapsed into one answer: "not read yet" and "could
 * not be read". These tests keep them apart — suppressing the false
 * alarm must not suppress the real one, which is the entire point of the
 * override existing.
 */

require("global-jsdom/register");

const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

let mod;

before(async () => {
  mod = await import("../public/dashboard-token-decimals.js");
});

/** The two token blocks as Pool Details renders them. */
function renderPoolDetails() {
  document.body.innerHTML = [0, 1]
    .map(
      (i) => `
      <input type="number" id="pdDecimals${i}">
      <input type="checkbox" id="pdDecimalsForce${i}">
      <button id="pdDecimalsSave${i}">Save</button>
      <span id="pdDecimalsBad${i}" hidden>couldn't be read</span>
      <span id="pdDecimalsOk${i}">only change this if…</span>`,
    )
    .join("");
}

beforeEach(() => {
  renderPoolDetails();
  localStorage.clear();
});

describe("_isDecimalsBad — the notice decision", () => {
  it("stays silent while unsynced, whatever the value looks like", () => {
    /*- The reported bug. undefined is the real pre-poll case; the others
     *  confirm the sync gate wins outright rather than racing the
     *  validity check. */
    for (const d of [undefined, null, NaN, -1, 8]) {
      assert.equal(
        mod._isDecimalsBad(false, d),
        false,
        `unsynced with ${String(d)} must not claim a read failure`,
      );
    }
  });

  it("still reports a genuinely unreadable value once synced", () => {
    /*- Suppressing the false alarm must not suppress the real one — the
     *  override exists for tokens whose decimals cannot be read. */
    for (const d of [undefined, null, NaN, "8", -1, 78, 8.5]) {
      assert.equal(
        mod._isDecimalsBad(true, d),
        true,
        `synced with ${String(d)} must be reported`,
      );
    }
  });

  it("accepts the full valid ERC-20 range once synced", () => {
    for (const d of [0, 6, 8, 18, 77]) {
      assert.equal(mod._isDecimalsBad(true, d), false, `${d} is valid`);
    }
  });

  it("treats zero decimals as valid, not as missing", () => {
    /*- 0 is falsy; a truthiness check here would flag a legitimate
     *  zero-decimal token as unreadable. */
    assert.equal(mod._isDecimalsBad(true, 0), false);
  });
});

describe("populateDecimalsOverride — controls before sync", () => {
  it("disables the whole mini-form for both tokens", () => {
    /*- No poll has landed in this test process, so isSyncComplete() is
     *  null — the pre-sync state the operator hit. */
    mod.populateDecimalsOverride();
    for (const i of [0, 1]) {
      for (const id of ["pdDecimals", "pdDecimalsForce", "pdDecimalsSave"]) {
        assert.equal(
          document.getElementById(id + i).disabled,
          true,
          `${id}${i} must be disabled until syncing finishes`,
        );
      }
    }
  });

  it("shows the neutral advisory, not the red failure notice", () => {
    mod.populateDecimalsOverride();
    for (const i of [0, 1]) {
      assert.equal(
        document.getElementById("pdDecimalsBad" + i).hidden,
        true,
        `token ${i}: must not claim the decimals could not be read`,
      );
      assert.equal(
        document.getElementById("pdDecimalsOk" + i).hidden,
        false,
        `token ${i}: the neutral advisory stays visible`,
      );
    }
  });

  it("leaves the field empty rather than inventing a value", () => {
    mod.populateDecimalsOverride();
    assert.equal(document.getElementById("pdDecimals0").value, "");
  });

  it("does not throw when the dialog is absent", () => {
    /*- Called on every Pool Details open; a missing element must not
     *  take the dashboard down. */
    document.body.innerHTML = "";
    assert.doesNotThrow(() => mod.populateDecimalsOverride());
  });
});

describe("refreshDecimalsOverrideOnPoll — live update on the sync transition", () => {
  /** Pool Details plus its overlay, in the given open/closed state. */
  function withModal(open) {
    const wrap = document.createElement("div");
    wrap.id = "poolDetailsModal";
    if (!open) wrap.className = "hidden";
    document.body.appendChild(wrap);
  }

  it("does nothing while the dialog is closed", () => {
    withModal(false);
    /*- Paint an obviously non-default state, then confirm the refresh
     *  leaves it alone rather than repainting a hidden dialog. */
    document.getElementById("pdDecimals0").disabled = false;
    mod.refreshDecimalsOverrideOnPoll();
    assert.equal(document.getElementById("pdDecimals0").disabled, false);
  });

  it("repaints when the dialog is open and the state is unpainted", () => {
    withModal(true);
    document.getElementById("pdDecimals0").disabled = false;
    document.getElementById("pdDecimalsSave0").disabled = false;
    mod.refreshDecimalsOverrideOnPoll();
    /*- Unsynced in this process, so a repaint must disable the form. */
    assert.equal(document.getElementById("pdDecimals0").disabled, true);
    assert.equal(document.getElementById("pdDecimalsSave0").disabled, true);
  });

  it("is a no-op on later polls while sync state is unchanged", () => {
    /*- The guard that stops a three-second repaint cycle from wiping out
     *  a value the operator is midway through typing. */
    withModal(true);
    mod.populateDecimalsOverride();
    const input = document.getElementById("pdDecimals0");
    input.value = "18"; // operator typing
    mod.refreshDecimalsOverrideOnPoll();
    mod.refreshDecimalsOverrideOnPoll();
    assert.equal(input.value, "18", "in-progress entry must survive polls");
  });

  it("repaints again after the dialog is closed and reopened", () => {
    /*- Closing clears the painted marker, so a reopen is never skipped
     *  as "already current". */
    withModal(true);
    mod.populateDecimalsOverride();
    const modal = document.getElementById("poolDetailsModal");
    modal.className = "hidden";
    mod.refreshDecimalsOverrideOnPoll(); // observes the close
    modal.className = "";
    const input = document.getElementById("pdDecimals0");
    input.disabled = false;
    mod.refreshDecimalsOverrideOnPoll();
    assert.equal(input.disabled, true, "reopen must repaint from scratch");
  });

  it("does not throw when Pool Details is not in the DOM", () => {
    document.body.innerHTML = "";
    assert.doesNotThrow(() => mod.refreshDecimalsOverrideOnPoll());
  });
});
