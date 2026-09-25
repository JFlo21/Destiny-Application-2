/**
 * Unit tests for champion mod detection and intrinsic socket detection.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { isChampionMod, findIntrinsicSocketIndex } = require('../../src/buildCrafting');

test('items with breakerType > 0 and a plug are champion mods', () => {
  const item = {
    displayProperties: { name: 'Anti-Barrier Auto Rifle', description: '' },
    breakerType: 1,
    plug: { plugCategoryIdentifier: 'artifact.mod' },
  };
  assert.strictEqual(isChampionMod(item), true);
});

test('artifact plugs with a breakerTypeHash are champion mods', () => {
  const item = {
    displayProperties: { name: 'Overload Rounds', description: '' },
    plug: { plugCategoryIdentifier: 'enhancements.artifact' },
    breakerTypeHash: 2611060930,
  };
  assert.strictEqual(isChampionMod(item), true);
});

test('items merely mentioning champions in text are NOT champion mods', () => {
  const item = {
    displayProperties: {
      name: 'Echo of Vigilance',
      description: 'Defeating a target while your shields are depleted... overload something.',
    },
    plug: { plugCategoryIdentifier: 'shared.void.fragments' },
  };
  assert.strictEqual(isChampionMod(item), false);
});

test('items without a plug are never champion mods', () => {
  const item = {
    displayProperties: { name: 'Unstoppable Weapon', description: 'Stuns Unstoppable Champions.' },
    breakerType: 3,
  };
  assert.strictEqual(isChampionMod(item), false);
});

test('intrinsic socket found via INTRINSIC_TRAITS socket category', () => {
  const item = {
    itemCategoryHashes: [20],
    sockets: {
      socketEntries: [{}, {}, {}],
      socketCategories: [
        { socketCategoryHash: 1234, socketIndexes: [0, 1] },
        { socketCategoryHash: 3956125808, socketIndexes: [2] },
      ],
    },
  };
  assert.strictEqual(findIntrinsicSocketIndex(item), 2);
});

test('weapons fall back to socket 0 when no intrinsic category exists', () => {
  const item = {
    itemCategoryHashes: [1],
    sockets: {
      socketEntries: [{}],
      socketCategories: [{ socketCategoryHash: 1234, socketIndexes: [0] }],
    },
  };
  assert.strictEqual(findIntrinsicSocketIndex(item), 0);
});

test('armor does NOT fall back to socket 0 without an intrinsic category', () => {
  const item = {
    itemCategoryHashes: [20],
    sockets: {
      socketEntries: [{}],
      socketCategories: [{ socketCategoryHash: 1234, socketIndexes: [0] }],
    },
  };
  assert.strictEqual(findIntrinsicSocketIndex(item), null);
});
