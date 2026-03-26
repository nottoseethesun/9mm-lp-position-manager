'use strict';

/**
 * @file test/position-rangeW.test.js
 * @description Tests for per-position OOR threshold localStorage persistence.
 * Mirrors the logic in dashboard-helpers.js (posStorageKey, savePositionOorThreshold,
 * loadPositionOorThreshold) using a mock localStorage.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('assert');

// ── Mock localStorage ───────────────────────────────────────────────────────

function createMockStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    _store: store,
  };
}

// ── Replicate the helpers from dashboard-helpers.js ─────────────────────────

const POS_RANGE_PREFIX = '9mm_oorThreshold_';

function posStorageKey(pos) {
  if (!pos) return null;
  if (pos.positionType === 'nft' && pos.tokenId)
    return POS_RANGE_PREFIX + 'nft_' + pos.tokenId;
  if (pos.contractAddress)
    return POS_RANGE_PREFIX + 'erc20_' + pos.contractAddress.toLowerCase();
  return null;
}

function savePositionOorThreshold(storage, pos, rangeWPct) {
  const key = posStorageKey(pos);
  if (!key) return;
  try {
    storage.setItem(key, String(rangeWPct));
  } catch (_) {
    /* private browsing */
  }
}

function loadPositionOorThreshold(storage, pos, fallback) {
  const def = fallback !== undefined ? fallback : 10;
  const key = posStorageKey(pos);
  if (!key) return def;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return def;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : def;
  } catch (_) {
    return def;
  }
}

// ── posStorageKey ───────────────────────────────────────────────────────────

describe('posStorageKey', () => {
  it('returns null for null/undefined position', () => {
    assert.strictEqual(posStorageKey(null), null);
    assert.strictEqual(posStorageKey(undefined), null);
  });

  it('returns NFT key for NFT positions', () => {
    const pos = { positionType: 'nft', tokenId: '12345' };
    assert.strictEqual(posStorageKey(pos), '9mm_oorThreshold_nft_12345');
  });

  it('returns ERC-20 key for ERC-20 positions (lowercased)', () => {
    const pos = { positionType: 'erc20', contractAddress: '0xABCdef1234' };
    assert.strictEqual(
      posStorageKey(pos),
      '9mm_oorThreshold_erc20_0xabcdef1234',
    );
  });

  it('returns null for NFT without tokenId', () => {
    const pos = { positionType: 'nft' };
    assert.strictEqual(posStorageKey(pos), null);
  });

  it('returns null for position without contractAddress or tokenId', () => {
    const pos = { positionType: 'other' };
    assert.strictEqual(posStorageKey(pos), null);
  });
});

// ── savePositionOorThreshold + loadPositionOorThreshold ─────────────────────────────────

describe('savePositionOorThreshold + loadPositionOorThreshold', () => {
  let storage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('round-trip: save then load returns saved value', () => {
    const pos = { positionType: 'nft', tokenId: '42' };
    savePositionOorThreshold(storage, pos, 15);
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 15);
  });

  it('returns default 10 when no value saved', () => {
    const pos = { positionType: 'nft', tokenId: '99' };
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 10);
  });

  it('returns custom fallback when specified and no value saved', () => {
    const pos = { positionType: 'nft', tokenId: '99' };
    assert.strictEqual(loadPositionOorThreshold(storage, pos, 30), 30);
  });

  it('overwrites previous value', () => {
    const pos = { positionType: 'nft', tokenId: '42' };
    savePositionOorThreshold(storage, pos, 10);
    savePositionOorThreshold(storage, pos, 25);
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 25);
  });

  it('stores different values per position', () => {
    const pos1 = { positionType: 'nft', tokenId: '1' };
    const pos2 = { positionType: 'nft', tokenId: '2' };
    savePositionOorThreshold(storage, pos1, 10);
    savePositionOorThreshold(storage, pos2, 30);
    assert.strictEqual(loadPositionOorThreshold(storage, pos1), 10);
    assert.strictEqual(loadPositionOorThreshold(storage, pos2), 30);
  });

  it('handles ERC-20 positions', () => {
    const pos = { positionType: 'erc20', contractAddress: '0xABC123' };
    savePositionOorThreshold(storage, pos, 12.5);
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 12.5);
  });

  it('returns default for invalid stored value (NaN)', () => {
    const pos = { positionType: 'nft', tokenId: '42' };
    storage.setItem(posStorageKey(pos), 'not-a-number');
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 10);
  });

  it('returns default for zero stored value', () => {
    const pos = { positionType: 'nft', tokenId: '42' };
    storage.setItem(posStorageKey(pos), '0');
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 10);
  });

  it('returns default for negative stored value', () => {
    const pos = { positionType: 'nft', tokenId: '42' };
    storage.setItem(posStorageKey(pos), '-5');
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 10);
  });

  it('silently returns default when position has no key', () => {
    const pos = { positionType: 'other' };
    savePositionOorThreshold(storage, pos, 15); // should do nothing
    assert.strictEqual(loadPositionOorThreshold(storage, pos), 10);
  });

  it('handles null position gracefully', () => {
    savePositionOorThreshold(storage, null, 15); // should not throw
    assert.strictEqual(loadPositionOorThreshold(storage, null), 10);
  });
});

// ── Startup behaviour ───────────────────────────────────────────────────────

describe('startup — range width restoration', () => {
  it('loads saved value for active position on startup', () => {
    const storage = createMockStorage();
    const pos = { positionType: 'nft', tokenId: '100' };
    savePositionOorThreshold(storage, pos, 35);

    // Simulate startup: load range width for the active position
    const rangeW = loadPositionOorThreshold(storage, pos);
    assert.strictEqual(rangeW, 35);
  });

  it('defaults to 10% when no saved value exists (fresh install)', () => {
    const storage = createMockStorage();
    const pos = { positionType: 'nft', tokenId: '100' };

    const rangeW = loadPositionOorThreshold(storage, pos);
    assert.strictEqual(rangeW, 10);
  });

  it('defaults to 10% when no active position exists', () => {
    const storage = createMockStorage();

    const rangeW = loadPositionOorThreshold(storage, null);
    assert.strictEqual(rangeW, 10);
  });
});
