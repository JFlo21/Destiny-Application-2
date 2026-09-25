/**
 * Unit tests for curated JSON data loading, validation and verb matching.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadCuratedData, matchVerbsInText, CURATED_FILES } = require('../../src/curated');

test('all curated files load and validate', () => {
  const curated = loadCuratedData();
  for (const key of Object.keys(CURATED_FILES)) {
    assert.ok(Array.isArray(curated[key]), `${key} should be an array`);
    assert.ok(curated[key].length > 0, `${key} should not be empty`);
  }
});

test('every curated entry has a source field', () => {
  const curated = loadCuratedData();
  for (const [key, entries] of Object.entries(curated)) {
    for (const entry of entries) {
      assert.ok(entry.source, `${key} entry missing source: ${JSON.stringify(entry)}`);
    }
  }
});

test('subclass verbs cover all six elements', () => {
  const { subclassVerbs } = loadCuratedData();
  const elements = new Set(subclassVerbs.map((v) => v.element));
  for (const element of ['Arc', 'Solar', 'Void', 'Stasis', 'Strand', 'Prismatic']) {
    assert.ok(elements.has(element), `missing element ${element}`);
  }
});

test('verb matching finds inflected forms but not substrings', () => {
  assert.ok(matchVerbsInText('Your grenades jolt targets.').includes('Jolt'));
  assert.ok(matchVerbsInText('Targets are jolted and blinded.').includes('Jolt'));
  assert.ok(matchVerbsInText('Freezing a target...').includes('Freeze'));
  // "slowly" must not match the Slow verb
  assert.ok(!matchVerbsInText('Reloads slowly.').includes('Slow'));
  assert.deepStrictEqual(matchVerbsInText(''), []);
});
