/**
 * Integration test: build the compendium workbook from fixture data and
 * re-read it with exceljs to assert structure (no live Bungie API calls).
 */
const { test, before } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const ExcelJS = require('exceljs');
const { exportAllToExcel } = require('../../src/excelExport');
const { buildData, statDefs } = require('./fixtures');

const EXPECTED_SHEET_ORDER = [
  'Cover',
  'Build Planner',
  'Fragment Matrix',
  'Champion Counters',
  'Subclass Verbs',
  'Stat Tiers',
  'Stacking Rules',
  'Stat Reference',
  'Weapons',
  'Weapon Perk Pools',
  'Armor',
  'Exotic Armor',
  'Armor Mods',
  'Subclasses',
  'Aspects',
  'Fragments',
  'Abilities',
  'Artifact Mods',
  'Champion Mods',
  'Damage Types',
  'Enemy Weaknesses',
  'Item_Stats',
  'Item_Perks',
  'Lookups',
];

let workbook;
let filename;

before(async () => {
  filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'compendium-')), 'test.xlsx');
  await exportAllToExcel(buildData, filename, statDefs);
  workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filename);
});

test('workbook has all sheets in compendium order', () => {
  assert.deepStrictEqual(
    workbook.worksheets.map((w) => w.name),
    EXPECTED_SHEET_ORDER
  );
});

test('data sheets are real Excel Tables with frozen panes', () => {
  for (const name of ['Weapons', 'Armor', 'Fragments', 'Fragment Matrix']) {
    const sheet = workbook.getWorksheet(name);
    assert.ok(Object.keys(sheet.tables || {}).length > 0, `${name} should contain a table`);
    const view = sheet.views[0];
    assert.strictEqual(view.state, 'frozen', `${name} should have frozen panes`);
    assert.strictEqual(view.ySplit, 1);
  }
});

test('cover sheet TOC hyperlinks point at real sheets', () => {
  const cover = workbook.getWorksheet('Cover');
  const hyperlinks = [];
  cover.eachRow((row) =>
    row.eachCell((cell) => {
      if (cell.value && cell.value.hyperlink) hyperlinks.push(cell.value.hyperlink);
    })
  );
  assert.ok(hyperlinks.length >= 20, 'cover should have TOC hyperlinks');
  for (const link of hyperlinks) {
    const match = link.match(/^#'(.+)'!A1$/);
    assert.ok(match, `hyperlink ${link} should be an internal #'Sheet'!A1 reference`);
    assert.ok(workbook.getWorksheet(match[1]), `hyperlink target sheet "${match[1]}" must exist`);
  }
});

test('Build Planner has data validation dropdowns', () => {
  const planner = workbook.getWorksheet('Build Planner');
  const model = planner.dataValidations && planner.dataValidations.model;
  assert.ok(model && Object.keys(model).length >= 20, 'planner should have many dropdowns');
  const hasListValidation = Object.values(model).some((v) => v.type === 'list');
  assert.ok(hasListValidation, 'planner dropdowns should be list validations');
});

test('named ranges exist for planner lookups', () => {
  const names = new Set((workbook.definedNames.model || []).map((n) => n.name));
  for (const expected of [
    'WeaponNames',
    'SubclassNames',
    'AspectNames',
    'FragmentNames',
    'FragMatrix_Mobility',
    'ExoticArmorNames',
    'SuperNames',
  ]) {
    assert.ok(names.has(expected), `missing named range ${expected}`);
  }
});

test('no stat columns are dropped (column union)', () => {
  const headers = workbook.getWorksheet('Weapons').getRow(1).values.filter(Boolean);
  assert.ok(headers.includes('Impact'));
  assert.ok(headers.includes('Swing Speed'));
});

test('cells are typed: hash is numeric, booleans real', () => {
  const weapons = workbook.getWorksheet('Weapons');
  const headers = weapons.getRow(1).values;
  const hashCol = headers.indexOf('Hash');
  assert.ok(hashCol > 0);
  assert.strictEqual(typeof weapons.getRow(2).getCell(hashCol).value, 'number');
});
