/**
 * Unit tests for current-season filtering of artifact/champion mods
 * (seasonHash match → current artifact membership → flagged last resort).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const {
  collectArtifactPlugHashes,
  selectCurrentSeasonMods,
} = require('../../src/buildCrafting');

const SEASON = 555;

const currentMod = { hash: 1, displayProperties: { name: 'Current Mod' }, seasonHash: SEASON };
const oldMod = { hash: 2, displayProperties: { name: 'Old Mod' }, seasonHash: 111 };
const unstampedCurrent = { hash: 3, displayProperties: { name: 'Unstamped Current' } };
const unstampedOld = { hash: 4, displayProperties: { name: 'Unstamped Old' } };

test('collectArtifactPlugHashes flattens tiers into a hash set', () => {
  const artifact = {
    tiers: [
      { items: [{ itemHash: 3 }, { itemHash: 7 }] },
      { items: [{ itemHash: 8 }] },
      { items: [] },
    ],
  };
  assert.deepStrictEqual([...collectArtifactPlugHashes(artifact)].sort(), [3, 7, 8]);
  assert.strictEqual(collectArtifactPlugHashes(undefined).size, 0);
  assert.strictEqual(collectArtifactPlugHashes({}).size, 0);
});

test('seasonHash matches win and exclude other seasons', () => {
  const result = selectCurrentSeasonMods([currentMod, oldMod], SEASON, new Set());
  assert.deepStrictEqual(result.map((m) => m.hash), [1]);
  assert.ok(result.every((m) => m.isCurrentSeason === true));
});

test('artifact membership filters unstamped plugs when no seasonHash matches', () => {
  // Neither mod has the current seasonHash; only hash 3 is on the current artifact
  const result = selectCurrentSeasonMods(
    [unstampedCurrent, unstampedOld, oldMod],
    SEASON,
    new Set([3])
  );
  assert.deepStrictEqual(result.map((m) => m.hash), [3]);
  assert.ok(result.every((m) => m.isCurrentSeason === true));
});

test('seasonHash matches and unstamped current-artifact plugs are unioned', () => {
  // currentMod is stamped with the season hash; unstampedCurrent has no
  // seasonHash but is on the current artifact — BOTH must be exported
  const result = selectCurrentSeasonMods(
    [currentMod, unstampedCurrent, unstampedOld, oldMod],
    SEASON,
    new Set([3])
  );
  assert.deepStrictEqual(result.map((m) => m.hash).sort(), [1, 3]);
  assert.ok(result.every((m) => m.isCurrentSeason === true));
});

test('last resort returns all items flagged isCurrentSeason=false', () => {
  const result = selectCurrentSeasonMods([unstampedCurrent, unstampedOld], SEASON, new Set());
  assert.strictEqual(result.length, 2);
  assert.ok(result.every((m) => m.isCurrentSeason === false));
});

test('historical mods are excluded whenever a current-season signal exists', () => {
  // seasonHash signal
  let result = selectCurrentSeasonMods([currentMod, oldMod, unstampedOld], SEASON, new Set());
  assert.ok(!result.some((m) => m.hash === 2 || m.hash === 4));
  // artifact signal
  result = selectCurrentSeasonMods([unstampedCurrent, unstampedOld], SEASON, new Set([3]));
  assert.ok(!result.some((m) => m.hash === 4));
});
