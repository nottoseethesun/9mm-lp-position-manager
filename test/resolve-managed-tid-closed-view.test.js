"use strict";

/**
 * @file test/resolve-managed-tid-closed-view.test.js
 * @description Tests the rebalance-follow guard in
 * public/dashboard-data.js :: _resolveManagedTid() and
 * public/dashboard-data-cache.js :: flattenV2Status().
 *
 * Bug: when the user viewed a closed NFT in the same pool as a
 * currently-managed live NFT, the same-pool matching logic fired
 * posStore.updateActiveTokenId() and flipped the view to the live
 * position, also corrupting the store entry for the closed NFT.
 *
 * Fix: only migrate from a closed active entry when it is linked to
 * the candidate managed tokenId via the on-chain rebalance chain
 * (oldTokenId -> newTokenId edges).  This preserves the legit
 * rebalance-from-drained-managed flow (a managed position that got
 * drained and minted a new NFT) while blocking the bug scenario
 * (browsing an unrelated closed NFT in the same pool).
 *
 * Mirrors the real logic because the actual modules pull DOM +
 * localStorage + ES-module deps that node:test can't load.
 */

const { describe, it } = require("node:test");
const assert = require("assert");

// ── Mirror of isPositionClosed ──────────────────────────────────────────

function isPositionClosed(pos) {
  if (pos.liquidity === undefined || pos.liquidity === null) return false;
  return String(pos.liquidity) === "0";
}

// ── Mirror of isInRebalanceChain ────────────────────────────────────────

function isInRebalanceChain(startTid, endTid, events) {
  if (!Array.isArray(events) || events.length === 0) return false;
  const byOld = new Map();
  for (const e of events) {
    if (e && e.oldTokenId !== undefined && e.newTokenId !== undefined) {
      byOld.set(String(e.oldTokenId), String(e.newTokenId));
    }
  }
  let cur = String(startTid);
  const target = String(endTid);
  const seen = new Set([cur]);
  while (byOld.has(cur)) {
    cur = byOld.get(cur);
    if (cur === target) return true;
    if (seen.has(cur)) return false;
    seen.add(cur);
  }
  return false;
}

// ── Mirror of _resolveManagedTid ────────────────────────────────────────

function resolveManagedTid(a, mp, states, onMigrate) {
  const tid = String(a.tokenId);
  if (mp.some((p) => String(p.tokenId) === tid)) return tid;
  if (!a.token0) return tid;
  const t0 = a.token0.toLowerCase(),
    f = a.fee;
  const m = mp.find((p) => {
    const ap = states[p.key]?.activePosition;
    return ap && ap.token0?.toLowerCase() === t0 && ap.fee === f;
  });
  if (!m || String(m.tokenId) === tid) return tid;
  if (
    isPositionClosed(a) &&
    !isInRebalanceChain(tid, m.tokenId, states[m.key]?.rebalanceEvents)
  ) {
    return tid;
  }
  if (onMigrate) onMigrate(m.tokenId);
  return m.tokenId;
}

// ── Fixture: HEX/HEX pool with live #159013 and closed #158981 ──────────

const POOL_T0 = "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39";
const FEE = 2500;
const LIVE = {
  tokenId: "159013",
  key: "pulsechain-0xW-0xC-159013",
  status: "running",
};
const STATES_NO_CHAIN = {
  [LIVE.key]: {
    activePosition: { token0: POOL_T0, token1: "0xT1", fee: FEE },
    rebalanceEvents: [],
  },
};
const STATES_WITH_CHAIN = {
  [LIVE.key]: {
    activePosition: { token0: POOL_T0, token1: "0xT1", fee: FEE },
    rebalanceEvents: [{ oldTokenId: "158981", newTokenId: "159013" }],
  },
};

describe("_resolveManagedTid: rebalance-follow guard", () => {
  it("migrates when active is a live managed position that just rebalanced", () => {
    /*-
     * Pre-rebalance tokenId was in mp; after rebalance the browser
     * still holds the old tokenId (with the old, non-zero liquidity
     * from the last scan). Fall-through should migrate.
     */
    const active = {
      tokenId: "158981",
      token0: POOL_T0,
      fee: FEE,
      liquidity: "12345",
    };
    let migrated = null;
    const tid = resolveManagedTid(
      active,
      [LIVE],
      STATES_NO_CHAIN,
      (nid) => (migrated = nid),
    );
    assert.strictEqual(tid, "159013");
    assert.strictEqual(migrated, "159013");
  });

  it("does NOT migrate when active is a closed NFT (liquidity=0) not in the rebalance chain", () => {
    /*-
     * Bug scenario: the user clicked a drained NFT in the position
     * browser.  It is in the same pool as a managed live position but
     * is NOT a predecessor of it in the rebalance chain — the user
     * picked this closed position deliberately.
     */
    const active = {
      tokenId: "158981",
      token0: POOL_T0,
      fee: FEE,
      liquidity: "0",
    };
    let migrated = null;
    const tid = resolveManagedTid(
      active,
      [LIVE],
      STATES_NO_CHAIN,
      (nid) => (migrated = nid),
    );
    assert.strictEqual(tid, "158981");
    assert.strictEqual(migrated, null);
  });

  it("DOES migrate a closed active when the chain links it to the managed tokenId (rebalance-from-drained-managed)", () => {
    /*-
     * Legit scenario: the user was managing #158981.  The position got
     * drained and rebalanced to a new NFT #159013.  The browser's
     * posStore entry still holds tokenId=158981 but with liquidity=0
     * (drained).  The rebalance event links the two, so the migration
     * must still fire.
     */
    const active = {
      tokenId: "158981",
      token0: POOL_T0,
      fee: FEE,
      liquidity: "0",
    };
    let migrated = null;
    const tid = resolveManagedTid(
      active,
      [LIVE],
      STATES_WITH_CHAIN,
      (nid) => (migrated = nid),
    );
    assert.strictEqual(tid, "159013");
    assert.strictEqual(migrated, "159013");
  });

  it("follows a multi-hop rebalance chain (A -> B -> C)", () => {
    const states = {
      [LIVE.key]: {
        activePosition: { token0: POOL_T0, token1: "0xT1", fee: FEE },
        rebalanceEvents: [
          { oldTokenId: "158981", newTokenId: "158999" },
          { oldTokenId: "158999", newTokenId: "159013" },
        ],
      },
    };
    const active = {
      tokenId: "158981",
      token0: POOL_T0,
      fee: FEE,
      liquidity: "0",
    };
    let migrated = null;
    const tid = resolveManagedTid(
      active,
      [LIVE],
      states,
      (nid) => (migrated = nid),
    );
    assert.strictEqual(tid, "159013");
    assert.strictEqual(migrated, "159013");
  });

  it("does not loop on a cyclic rebalance chain", () => {
    /*-
     * Defensive: a cycle in the chain (shouldn't happen in practice)
     * must not hang; the guard should treat cur=target as reached or
     * give up without looping forever.
     */
    const states = {
      [LIVE.key]: {
        activePosition: { token0: POOL_T0, token1: "0xT1", fee: FEE },
        rebalanceEvents: [
          { oldTokenId: "A", newTokenId: "B" },
          { oldTokenId: "B", newTokenId: "A" },
        ],
      },
    };
    const active = { tokenId: "A", token0: POOL_T0, fee: FEE, liquidity: "0" };
    let migrated = null;
    const tid = resolveManagedTid(
      active,
      [LIVE],
      states,
      (nid) => (migrated = nid),
    );
    assert.strictEqual(tid, "A");
    assert.strictEqual(migrated, null);
  });

  it("returns tid as-is when active's tokenId is already in the managed list", () => {
    const active = {
      tokenId: "159013",
      token0: POOL_T0,
      fee: FEE,
      liquidity: "0",
    };
    let migrated = null;
    const tid = resolveManagedTid(
      active,
      [LIVE],
      STATES_NO_CHAIN,
      (nid) => (migrated = nid),
    );
    assert.strictEqual(tid, "159013");
    assert.strictEqual(migrated, null);
  });

  it("returns tid as-is when active has no token0 (can't match pool)", () => {
    const active = { tokenId: "158981", liquidity: "12345" };
    let migrated = null;
    const tid = resolveManagedTid(
      active,
      [LIVE],
      STATES_NO_CHAIN,
      (nid) => (migrated = nid),
    );
    assert.strictEqual(tid, "158981");
    assert.strictEqual(migrated, null);
  });
});
