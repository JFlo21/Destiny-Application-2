/**
 * Unit tests for Excel sheet/table name sanitization.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const {
  sanitizeSheetName,
  sanitizeTableName,
  resetTableNames,
} = require('../../src/excel/tableWriter');

test('sheet names strip forbidden characters and cap at 31 chars', () => {
  assert.strictEqual(sanitizeSheetName('Weap[on]s: */?\\Test'), 'Weapons Test');
  assert.strictEqual(sanitizeSheetName('x'.repeat(50)).length, 31);
  assert.strictEqual(sanitizeSheetName(''), 'Sheet');
});

test('table names are alphanumeric/underscore and unique', () => {
  resetTableNames();
  assert.strictEqual(sanitizeTableName('tbl Weapons!'), 'tblWeapons');
  assert.strictEqual(sanitizeTableName('tbl Weapons!'), 'tblWeapons_2');
  assert.strictEqual(sanitizeTableName('tbl Weapons!'), 'tblWeapons_3');
  // Must not start with a digit
  assert.match(sanitizeTableName('123abc'), /^tbl123abc/);
  resetTableNames();
  assert.strictEqual(sanitizeTableName('tbl Weapons!'), 'tblWeapons');
});
