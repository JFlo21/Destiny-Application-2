/**
 * Unit tests for schema-driven column building and value typing.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { getSchema, transformRows, columnsForRows } = require('../../src/schemas');
const { buildColumns } = require('../../src/schemas/shared');
const { typedValue } = require('../../src/excel/tableWriter');
const { buildData, statDefs } = require('./fixtures');

test('weapon columns are the union of stat keys across all rows', () => {
  const rows = transformRows(buildData.weapons, 'weapons', { statDefs });
  const columns = columnsForRows('weapons', rows);
  const keys = columns.map((c) => c.key);
  // Row 1 (auto rifle) has Impact/Range; row 2 (sword) has Swing Speed —
  // both must be present even though neither row has all three.
  assert.ok(keys.includes('Impact'));
  assert.ok(keys.includes('Range'));
  assert.ok(keys.includes('Swing Speed'));
});

test('stat columns follow the canonical weapon stat order', () => {
  const rows = transformRows(buildData.weapons, 'weapons', { statDefs });
  const keys = columnsForRows('weapons', rows).map((c) => c.key);
  assert.ok(keys.indexOf('Impact') < keys.indexOf('Range'));
  assert.ok(keys.indexOf('Range') < keys.indexOf('Swing Speed'));
});

test('legacy duplicate keys are excluded from Excel columns', () => {
  const rows = transformRows(buildData.weapons, 'weapons', { statDefs });
  const keys = columnsForRows('weapons', rows).map((c) => c.key);
  assert.ok(!keys.includes('damageTypeName'));
  assert.ok(!keys.includes('defaultDamageType'));
  assert.ok(keys.includes('damageType'));
  assert.ok(keys.includes('damageTypeEnum'));
});

test('buildColumns falls back to declared columns when rows are empty', () => {
  const schema = getSchema('weapons');
  const columns = buildColumns(schema, []);
  assert.ok(columns.length > 0);
  assert.deepStrictEqual(
    columns.map((c) => c.key),
    schema.columns.map((c) => c.key)
  );
});

test('typedValue coerces numbers, booleans and URLs', () => {
  assert.strictEqual(typedValue('42', { type: 'number' }), 42);
  assert.strictEqual(typedValue('not a number', { type: 'number' }), null);
  assert.strictEqual(typedValue('true', { type: 'boolean' }), true);
  assert.strictEqual(typedValue(false, { type: 'boolean' }), false);
  const link = typedValue('https://bungie.net/img.png', { type: 'url' });
  assert.deepStrictEqual(link, { text: 'link', hyperlink: 'https://bungie.net/img.png' });
  assert.strictEqual(typedValue('', {}), null);
  assert.strictEqual(typedValue(7, {}), 7);
});

test('transformed weapon rows carry typed hash and stats', () => {
  const rows = transformRows(buildData.weapons, 'weapons', { statDefs });
  assert.strictEqual(typeof rows[0].hash, 'number');
  assert.strictEqual(typeof rows[0].Impact, 'number');
  assert.strictEqual(rows[0].Impact, 21);
});
