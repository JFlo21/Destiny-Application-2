/**
 * Interactive Build Planner sheet.
 *
 * All inputs are data-validation dropdowns backed by named ranges defined on
 * the Lookups sheet / catalog sheets, and all outputs are formulas (XLOOKUP,
 * SUM, INT) that resolve against the catalog tables — so the planner keeps
 * working when users re-export fresh data.
 *
 * NOTE: Requires Excel 365 (XLOOKUP + dynamic array formulas).
 */
const theme = require('./theme');

/** Armor stat names used by the planner (classic set) */
const PLANNER_STATS = ['Mobility', 'Resilience', 'Recovery', 'Discipline', 'Intellect', 'Strength'];

/** Armor slots for the mod grid */
const ARMOR_SLOTS = ['Helmet', 'Arms', 'Chest', 'Legs', 'Class Item'];

/**
 * Style a label cell
 * @param {object} cell - exceljs cell
 */
function label(cell, text) {
  cell.value = text;
  cell.font = { name: 'Segoe UI', size: 10, bold: true };
}

/**
 * Style an input cell (light fill + border + dropdown validation)
 * @param {object} cell - exceljs cell
 * @param {string|null} listFormula - Data-validation list formula (named range or literal)
 */
function input(cell, listFormula) {
  cell.fill = theme.solidFill(theme.INPUT_FILL);
  cell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };
  cell.font = { name: 'Segoe UI', size: 10 };
  if (listFormula) {
    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      showErrorMessage: false,
      formulae: [listFormula],
    };
  }
}

/**
 * Section header banner across columns
 */
function section(sheet, row, text, span = 8) {
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  cell.fill = theme.solidFill(theme.SECTION_FILL);
  cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 2; c <= span; c++) {
    sheet.getCell(row, c).fill = theme.solidFill(theme.SECTION_FILL);
  }
}

/**
 * XLOOKUP wrapped in IFERROR returning '' when not found
 */
function xl(lookupCell, namesRange, valuesRange, fallback = '""') {
  return `IFERROR(XLOOKUP(${lookupCell},${namesRange},${valuesRange}),${fallback})`;
}

/**
 * Add the Build Planner sheet.
 * @param {object} workbook - exceljs workbook
 * @param {object} options
 * @param {object[]} options.championCounters - Curated champion counter entries
 */
function addBuildPlanner(workbook, { championCounters = [] } = {}) {
  const sheet = workbook.addWorksheet('Build Planner', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: theme.argb(theme.GROUP_TAB_COLORS.Planner) } },
  });
  sheet.getColumn(1).width = 18;
  for (const c of [2, 3, 4, 5, 6]) sheet.getColumn(c).width = 24;
  sheet.getColumn(7).width = 16;
  sheet.getColumn(8).width = 70;

  // Title
  const title = sheet.getCell(1, 1);
  title.value = 'Build Planner';
  title.font = { name: 'Segoe UI', size: 16, bold: true };
  sheet.getCell(1, 3).value = 'Pick from the dropdowns — descriptions and totals update automatically (Excel 365 required)';
  sheet.getCell(1, 3).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF666666' } };

  // ============ SUBCLASS SECTION ============
  section(sheet, 3, 'SUBCLASS');
  const rows = {
    class: 4, subclass: 5, super: 6, grenade: 7, melee: 8, classAbility: 9,
    aspect1: 10, aspect2: 11,
    fragmentsStart: 12, // 12..17 = Fragment 1..6
  };

  label(sheet.getCell(rows.class, 1), 'Class');
  input(sheet.getCell(rows.class, 2), '"Titan,Hunter,Warlock"');

  label(sheet.getCell(rows.subclass, 1), 'Subclass');
  input(sheet.getCell(rows.subclass, 2), '=SubclassNames');
  // Element of the chosen subclass + class-mismatch warning
  sheet.getCell(rows.subclass, 3).value = {
    formula: `=${xl(`B${rows.subclass}`, 'SubclassNames', 'SubclassElements')}`,
  };
  sheet.getCell(rows.subclass, 4).value = {
    formula:
      `=IF(AND(B${rows.class}<>"",B${rows.subclass}<>"",` +
      `${xl(`B${rows.subclass}`, 'SubclassNames', 'SubclassClasses')}<>B${rows.class}),` +
      `"⚠ Subclass does not match selected class","")`,
  };
  sheet.getCell(rows.subclass, 4).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF9C0006' } };

  const abilityRows = [
    ['Super', rows.super, '=SuperNames'],
    ['Grenade', rows.grenade, '=GrenadeNames'],
    ['Melee', rows.melee, '=MeleeNames'],
    ['Class Ability', rows.classAbility, '=ClassAbilityNames'],
  ];
  for (const [text, row, list] of abilityRows) {
    label(sheet.getCell(row, 1), text);
    input(sheet.getCell(row, 2), list);
    sheet.getCell(row, 8).value = {
      formula: `=${xl(`B${row}`, 'AbilityNames', 'AbilityDescriptions')}`,
    };
    sheet.getCell(row, 8).alignment = { wrapText: true, vertical: 'top' };
  }

  for (const [i, row] of [[1, rows.aspect1], [2, rows.aspect2]]) {
    label(sheet.getCell(row, 1), `Aspect ${i}`);
    input(sheet.getCell(row, 2), '=AspectNames');
    sheet.getCell(row, 3).value = {
      formula: `=${xl(`B${row}`, 'AspectNames', 'AspectFragmentSlots', '0')}`,
    };
    sheet.getCell(row, 8).value = {
      formula: `=${xl(`B${row}`, 'AspectNames', 'AspectDescriptions')}`,
    };
    sheet.getCell(row, 8).alignment = { wrapText: true, vertical: 'top' };
  }
  sheet.getCell(rows.aspect1, 4).value = '← fragment slots granted';
  sheet.getCell(rows.aspect1, 4).font = { name: 'Segoe UI', size: 8, italic: true };

  for (let i = 0; i < 6; i++) {
    const row = rows.fragmentsStart + i;
    label(sheet.getCell(row, 1), `Fragment ${i + 1}`);
    input(sheet.getCell(row, 2), '=FragmentNames');
    sheet.getCell(row, 8).value = {
      formula: `=${xl(`B${row}`, 'FragmentNames', 'FragmentDescriptions')}`,
    };
    sheet.getCell(row, 8).alignment = { wrapText: true, vertical: 'top' };
  }
  const fragFirst = rows.fragmentsStart;
  const fragLast = rows.fragmentsStart + 5;

  // ============ GEAR SECTION ============
  const gearRow = fragLast + 2;
  section(sheet, gearRow, 'GEAR');
  const exoticRow = gearRow + 1;
  const kineticRow = gearRow + 2;
  const energyRow = gearRow + 3;
  const powerRow = gearRow + 4;

  label(sheet.getCell(exoticRow, 1), 'Exotic Armor');
  input(sheet.getCell(exoticRow, 2), '=ExoticArmorNames');
  sheet.getCell(exoticRow, 8).value = {
    formula: `=${xl(`B${exoticRow}`, 'ExoticArmorNames', 'ExoticArmorIntrinsics')}`,
  };
  sheet.getCell(exoticRow, 8).alignment = { wrapText: true, vertical: 'top' };

  const weaponRows = [
    ['Kinetic Weapon', kineticRow, 'KineticWeaponNames'],
    ['Energy Weapon', energyRow, 'EnergyWeaponNames'],
    ['Power Weapon', powerRow, 'PowerWeaponNames'],
  ];
  for (const [text, row, slotRange] of weaponRows) {
    label(sheet.getCell(row, 1), text);
    // Dropdown restricted to weapons that actually fit this slot; lookups
    // still resolve against the full Weapons sheet columns
    input(sheet.getCell(row, 2), `=${slotRange}`);
    sheet.getCell(row, 3).value = {
      formula: `=${xl(`B${row}`, 'WeaponNames', 'WeaponElements')}`,
    };
    sheet.getCell(row, 4).value = {
      formula: `=${xl(`B${row}`, 'WeaponNames', 'WeaponBreakers')}`,
    };
    sheet.getCell(row, 8).value = {
      formula: `=${xl(`B${row}`, 'WeaponNames', 'WeaponFrames')}`,
    };
    sheet.getCell(row, 8).alignment = { wrapText: true, vertical: 'top' };
  }

  // ============ ARMOR MODS SECTION ============
  const modsHeaderRow = powerRow + 2;
  section(sheet, modsHeaderRow, 'ARMOR MODS (up to 5 per piece)');
  const modGridStart = modsHeaderRow + 1;
  ['', 'Mod 1', 'Mod 2', 'Mod 3', 'Mod 4', 'Mod 5', 'Energy Used'].forEach((text, i) => {
    const cell = sheet.getCell(modGridStart, i + 1);
    cell.value = text;
    cell.font = { name: 'Segoe UI', size: 9, bold: true };
  });
  ARMOR_SLOTS.forEach((slot, s) => {
    const row = modGridStart + 1 + s;
    label(sheet.getCell(row, 1), slot);
    for (let m = 0; m < 5; m++) {
      input(sheet.getCell(row, 2 + m), '=ArmorModNames');
    }
    // Per-piece energy used; flagged red when > 10 via conditional formatting below
    const terms = [];
    for (let m = 0; m < 5; m++) {
      const cellRef = sheet.getCell(row, 2 + m).address;
      terms.push(xl(cellRef, 'ArmorModNames', 'ArmorModEnergy', '0'));
    }
    sheet.getCell(row, 7).value = { formula: `=${terms.join('+')}` };
    sheet.getCell(row, 7).numFmt = '0';
  });
  const modGridFirstDataRow = modGridStart + 1;
  const modGridLastDataRow = modGridStart + ARMOR_SLOTS.length;
  sheet.addConditionalFormatting({
    ref: `G${modGridFirstDataRow}:G${modGridLastDataRow}`,
    rules: [
      {
        type: 'cellIs',
        operator: 'greaterThan',
        formulae: [10],
        priority: 1,
        style: { fill: theme.solidFill('FFC7CE'), font: { color: { argb: 'FF9C0006' } } },
      },
    ],
  });

  // ============ BASE STATS SECTION ============
  const baseStatsHeaderRow = modGridLastDataRow + 2;
  section(sheet, baseStatsHeaderRow, 'BASE ARMOR STATS');
  const baseStatsRow = baseStatsHeaderRow + 2;
  PLANNER_STATS.forEach((stat, i) => {
    const cell = sheet.getCell(baseStatsHeaderRow + 1, 2 + i);
    cell.value = stat;
    cell.font = { name: 'Segoe UI', size: 9, bold: true };
    input(sheet.getCell(baseStatsRow, 2 + i), null);
    sheet.getCell(baseStatsRow, 2 + i).numFmt = '0';
  });
  label(sheet.getCell(baseStatsRow, 1), 'Base Stats');

  // ============ OUTPUTS SECTION ============
  const outHeaderRow = baseStatsRow + 2;
  section(sheet, outHeaderRow, 'BUILD SUMMARY');
  let outRow = outHeaderRow + 1;

  // Fragment slot budget
  label(sheet.getCell(outRow, 1), 'Fragment Slots');
  sheet.getCell(outRow, 2).value = {
    formula: `=${xl(`B${rows.aspect1}`, 'AspectNames', 'AspectFragmentSlots', '0')}+` +
      `${xl(`B${rows.aspect2}`, 'AspectNames', 'AspectFragmentSlots', '0')}`,
  };
  sheet.getCell(outRow, 3).value = { formula: `=COUNTA(B${fragFirst}:B${fragLast})` };
  sheet.getCell(outRow, 4).value = {
    formula: `=IF(C${outRow}>B${outRow},"⚠ Too many fragments","OK")`,
  };
  sheet.getCell(outRow, 5).value = '(available / used)';
  sheet.getCell(outRow, 5).font = { name: 'Segoe UI', size: 8, italic: true };
  const fragmentBudgetRow = outRow;
  outRow += 2;

  // Stat table: header, fragment deltas, final stats, tiers
  const statHeaderRow = outRow;
  PLANNER_STATS.forEach((stat, i) => {
    const cell = sheet.getCell(statHeaderRow, 2 + i);
    cell.value = stat;
    cell.font = { name: 'Segoe UI', size: 9, bold: true };
  });
  outRow += 1;
  const fragDeltaRow = outRow;
  label(sheet.getCell(fragDeltaRow, 1), 'Fragment Δ');
  PLANNER_STATS.forEach((stat, i) => {
    const terms = [];
    for (let f = fragFirst; f <= fragLast; f++) {
      terms.push(xl(`B${f}`, 'FragMatrixNames', `FragMatrix_${stat}`, '0'));
    }
    const cell = sheet.getCell(fragDeltaRow, 2 + i);
    cell.value = { formula: `=${terms.join('+')}` };
    cell.numFmt = '+0;-0;0';
  });
  outRow += 1;
  const finalStatRow = outRow;
  label(sheet.getCell(finalStatRow, 1), 'Final Stats');
  PLANNER_STATS.forEach((stat, i) => {
    const col = String.fromCharCode(66 + i); // B..G
    const cell = sheet.getCell(finalStatRow, 2 + i);
    cell.value = {
      formula: `=N(${col}${baseStatsRow})+N(${col}${fragDeltaRow})`,
    };
    cell.numFmt = '0';
    cell.font = { name: 'Segoe UI', size: 10, bold: true };
  });
  outRow += 1;
  const tierRow = outRow;
  label(sheet.getCell(tierRow, 1), 'Tier');
  PLANNER_STATS.forEach((stat, i) => {
    const col = String.fromCharCode(66 + i);
    const cell = sheet.getCell(tierRow, 2 + i);
    cell.value = { formula: `=INT(${col}${finalStatRow}/10)` };
    cell.numFmt = '0';
  });
  outRow += 2;

  // All verbs granted by selected aspects + fragments (helper for champion coverage)
  const verbsRow = outRow;
  label(sheet.getCell(verbsRow, 1), 'Verbs Granted');
  {
    const parts = [
      xl(`B${rows.aspect1}`, 'AspectNames', 'AspectVerbs'),
      xl(`B${rows.aspect2}`, 'AspectNames', 'AspectVerbs'),
    ];
    for (let f = fragFirst; f <= fragLast; f++) {
      parts.push(xl(`B${f}`, 'FragmentNames', 'FragmentVerbs'));
    }
    sheet.getCell(verbsRow, 2).value = { formula: `=TEXTJOIN(", ",TRUE,${parts.join(',')})` };
    sheet.mergeCells(verbsRow, 2, verbsRow, 6);
  }
  outRow += 2;

  // Champion coverage: derive per-champion verb lists from curated counters
  const coverageRow = outRow;
  label(sheet.getCell(coverageRow, 1), 'Champion Coverage');
  const champions = ['Barrier', 'Overload', 'Unstoppable'];
  const breakerKeywords = {
    Barrier: 'Anti-Barrier',
    Overload: 'Overload',
    Unstoppable: 'Unstoppable',
  };
  champions.forEach((champ, i) => {
    const headerCell = sheet.getCell(coverageRow, 2 + i * 2);
    headerCell.value = champ;
    headerCell.font = { name: 'Segoe UI', size: 9, bold: true };
    const verbs = championCounters
      .filter((c) => c.championType === champ && c.methodType === 'verb')
      .map((c) => c.stunMethod);
    // Covered if: any selected weapon has the matching breaker type, OR any
    // granted verb (from fragments/aspects) stuns this champion type.
    const weaponChecks = [kineticRow, energyRow, powerRow].map(
      (r) => `ISNUMBER(SEARCH("${breakerKeywords[champ]}",D${r}&""))`
    );
    const verbChecks = verbs.map((v) => `ISNUMBER(SEARCH("${v}",B${verbsRow}&""))`);
    const cell = sheet.getCell(coverageRow, 3 + i * 2);
    cell.value = {
      formula: `=IF(OR(${[...weaponChecks, ...verbChecks].join(',')}),"✔","—")`,
    };
    cell.font = { name: 'Segoe UI', size: 11, bold: true };
  });
  outRow += 2;

  // Element synergy note
  const synergyRow = outRow;
  label(sheet.getCell(synergyRow, 1), 'Element Synergy');
  {
    const sub = `C${rows.subclass}`;
    const checks = [kineticRow, energyRow, powerRow]
      .map((r) => `(C${r}=${sub})`)
      .join(',');
    sheet.getCell(synergyRow, 2).value = {
      formula:
        `=IF(${sub}="","Pick a subclass",IF(OR(${sub}="Prismatic",${checks}),` +
        `"OK — weapon element matches subclass","⚠ No weapon matches your subclass element"))`,
    };
    sheet.mergeCells(synergyRow, 2, synergyRow, 6);
  }

  return { sheet, fragmentBudgetRow };
}

module.exports = { addBuildPlanner, PLANNER_STATS, ARMOR_SLOTS };
