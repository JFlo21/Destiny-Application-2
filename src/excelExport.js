/**
 * Excel exporters.
 *
 * `exportAllToExcel` builds the "Destiny 2 Buildcraft Compendium" workbook:
 * a Cover/TOC sheet, an interactive Build Planner, curated mechanics sheets,
 * catalog sheets rendered as real Excel Tables, normalized long-format sheets
 * (Item_Stats / Item_Perks / Weapon Perk Pools), and a Lookups sheet that
 * powers the planner dropdowns via named ranges.
 *
 * `exportToExcel` and `exportAllToSeparateExcelFiles` keep their original
 * signatures for backwards compatibility.
 */
const path = require('path');
const ExcelJS = require('exceljs');
const {
  generateStatReference,
  resolveStatName,
  extractElementFromPlugCategory,
} = require('./csvExport');
const { EXPORT_CATEGORIES, GROUP_TAB_COLORS } = require('./categories');
const {
  transformRows,
  columnsForRows,
  buildItemStatRows,
  buildItemPerkRows,
  buildWeaponPerkPoolRows,
  itemStats: itemStatsSchema,
  itemPerks: itemPerksSchema,
  weaponPerkPools: weaponPerkPoolsSchema,
} = require('./schemas');
const { buildColumns, col } = require('./schemas/shared');
const { loadCuratedData, matchVerbsInText } = require('./curated');
const { writeTableSheet, resetTableNames } = require('./excel/tableWriter');
const { addCoverSheet } = require('./excel/coverSheet');
const { addBuildPlanner, PLANNER_STATS } = require('./excel/buildPlanner');
const { CLASS_TYPES } = require('./constants');
const theme = require('./excel/theme');

/**
 * Named ranges each catalog sheet exposes for Build Planner formulas.
 * Maps category key -> { RangeName: columnKey }.
 */
const NAMED_RANGES = {
  weapons: {
    WeaponNames: 'name',
    WeaponElements: 'damageType',
    WeaponBreakers: 'breakerType',
    WeaponFrames: 'intrinsicPerkName',
  },
  subclasses: {
    SubclassNames: 'name',
    SubclassElements: 'damageType',
    SubclassClasses: 'classType',
  },
  aspects: {
    AspectNames: 'name',
    AspectFragmentSlots: 'fragmentSlots',
    AspectDescriptions: 'description',
    AspectVerbs: 'verbs',
  },
  fragments: {
    FragmentNames: 'name',
    FragmentDescriptions: 'description',
    FragmentVerbs: 'verbs',
  },
  abilities: {
    AbilityNames: 'name',
    AbilityDescriptions: 'description',
  },
  armorMods: {
    ArmorModNames: 'name',
    ArmorModEnergy: 'energyCost',
  },
};

/** Catalog sheet order used by the compendium (spec Part 4 sheet order). */
const CATALOG_ORDER = [
  'weapons',
  'armor',
  'armorMods',
  'subclasses',
  'aspects',
  'fragments',
  'abilities',
  'artifactMods',
  'championMods',
  'damageTypes',
  'enemyWeaknesses',
];

/**
 * Load curated data, tolerating a missing data/curated directory so the
 * exporter still works in stripped-down environments.
 * @returns {object|null}
 */
function getCuratedSafe() {
  try {
    return loadCuratedData();
  } catch (error) {
    console.warn(`Curated data unavailable: ${error.message}`);
    return null;
  }
}

/**
 * Legacy single-sheet writer kept for backwards compatibility.
 * @param {ExcelJS.Workbook} workbook - Excel workbook
 * @param {string} sheetName - Name of the worksheet
 * @param {object[]} data - Array of raw items
 * @param {string} category - Category name for transformation
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
function addWorksheet(workbook, sheetName, data, category, statDefs = null) {
  if (!data || data.length === 0) {
    console.log(`Skipping empty sheet: ${sheetName}`);
    return;
  }
  const curated = getCuratedSafe();
  const ctx = { statDefs, subclassVerbs: curated?.subclassVerbs };
  const rows = transformRows(data, category, ctx);
  const columns = columnsForRows(category, rows);
  writeTableSheet(workbook, { sheetName, columns, rows });
  console.log(`Added sheet "${sheetName}" with ${data.length} items`);
}

/**
 * Export a single category to its own Excel file — backwards compatible.
 * @param {object[]} data - Array of raw items
 * @param {string} filename - Output filename
 * @param {string} category - Category name for transformation
 * @param {object} statDefs - Optional stat definitions
 */
async function exportToExcel(data, filename, category, statDefs = null) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Destiny 2 Build Crafting Data Exporter';
    workbook.created = new Date();
    resetTableNames();
    addWorksheet(workbook, category, data, category, statDefs);
    await workbook.xlsx.writeFile(filename);
    console.log(`Exported ${data.length} ${category} to ${filename}`);
  } catch (error) {
    console.error(`Error exporting ${category} to Excel:`, error.message);
    throw error;
  }
}

/**
 * Build Fragment Matrix rows: one row per fragment with the six armor stat
 * deltas as signed numeric columns (derived from investmentStats).
 * @param {object[]} fragments - Enriched fragment items
 * @param {object} ctx - { statDefs, subclassVerbs }
 * @returns {{rows: object[], columns: object[]}}
 */
function buildFragmentMatrix(fragments, ctx) {
  const rows = (fragments || []).map((item) => {
    const row = {
      name: item.displayProperties?.name || '',
      element: extractElementFromPlugCategory(item.plug?.plugCategoryIdentifier) || '',
      verbs: matchVerbsInText(
        item.displayProperties?.description || '',
        ctx.subclassVerbs
      ).join(', '),
    };
    for (const stat of PLANNER_STATS) row[stat] = 0;
    for (const stat of item.investmentStats || []) {
      const statName = resolveStatName(stat.statTypeHash, ctx.statDefs);
      if (PLANNER_STATS.includes(statName)) {
        row[statName] = stat.value || 0;
      }
    }
    return row;
  });

  const columns = [
    col('name', 'Fragment', 32),
    col('element', 'Element', 12),
    col('verbs', 'Verbs Granted', 34, { wrap: true }),
    ...PLANNER_STATS.map((stat) =>
      col(stat, stat, 12, { type: 'number', numFmt: '+0;-0;0', isStat: true })
    ),
  ];
  return { rows, columns };
}

/**
 * Build Exotic Armor rows: exotic armor only, with class, slot, and the
 * intrinsic (exotic) perk name/description.
 * @param {object[]} armor - Enriched armor items
 * @returns {{rows: object[], columns: object[]}}
 */
function buildExoticArmor(armor) {
  const rows = (armor || [])
    .filter((item) => item.inventory?.tierTypeName === 'Exotic')
    .map((item) => ({
      name: item.displayProperties?.name || '',
      classType: item.classType !== undefined ? CLASS_TYPES[item.classType] || 'Any' : '',
      slot: item.itemTypeDisplayName || '',
      intrinsicPerkName: item.enrichedIntrinsicPerk?.name || '',
      intrinsicPerkDescription: item.enrichedIntrinsicPerk?.description || '',
      // Combined text used by the Build Planner description lookup
      intrinsic: item.enrichedIntrinsicPerk
        ? `${item.enrichedIntrinsicPerk.name}: ${item.enrichedIntrinsicPerk.description}`
        : '',
      hash: item.hash,
    }));
  const columns = [
    col('name', 'Exotic', 32),
    col('classType', 'Class', 10),
    col('slot', 'Slot', 16),
    col('intrinsicPerkName', 'Intrinsic Perk', 28),
    col('intrinsicPerkDescription', 'Intrinsic Description', 70, { wrap: true }),
    col('intrinsic', 'Intrinsic (Combined)', 40, { wrap: true }),
    col('hash', 'Hash', 14, { type: 'number', numFmt: '0' }),
  ];
  return { rows, columns };
}

/**
 * Curated mechanics sheet specs (Champion Counters, Subclass Verbs,
 * Stat Tiers, Stacking Rules), each carrying a Source column.
 * @param {object} curated - Loaded curated data
 * @returns {Array<{sheetName: string, rows: object[], columns: object[]}>}
 */
function curatedSheetSpecs(curated) {
  return [
    {
      sheetName: 'Champion Counters',
      rows: curated.championCounters,
      columns: [
        col('championType', 'Champion', 14),
        col('stunMethod', 'Stun Method', 34),
        col('methodType', 'Method Type', 12),
        col('element', 'Element', 12),
        col('notes', 'Notes', 70, { wrap: true }),
        col('source', 'Source', 10),
      ],
    },
    {
      sheetName: 'Subclass Verbs',
      rows: curated.subclassVerbs,
      columns: [
        col('element', 'Element', 12),
        col('verb', 'Verb', 18),
        col('type', 'Type', 10),
        col('description', 'Description', 70, { wrap: true }),
        col('pve', 'PvE Notes', 45, { wrap: true }),
        col('pvp', 'PvP Notes', 45, { wrap: true }),
        col('source', 'Source', 10),
      ],
    },
    {
      sheetName: 'Stat Tiers',
      rows: curated.armorStatTiers,
      columns: [
        col('stat', 'Stat', 14),
        col('tier', 'Tier', 8, { type: 'number', numFmt: '0' }),
        col('value', 'Stat Value', 10, { type: 'number', numFmt: '0' }),
        col('note', 'Effect', 80, { wrap: true }),
        col('verified', 'Verified', 10, { type: 'boolean' }),
        col('source', 'Source', 10),
      ],
    },
    {
      sheetName: 'Stacking Rules',
      rows: curated.stackingRules,
      columns: [
        col('category', 'Category', 26),
        col('examples', 'Examples', 45, { wrap: true }),
        col('stacking', 'Stacking Behavior', 60, { wrap: true }),
        col('notes', 'Notes', 50, { wrap: true }),
        col('source', 'Source', 10),
      ],
    },
  ];
}

/**
 * Add the Lookups sheet powering planner dropdowns: Super / Grenade / Melee /
 * Class Ability name lists (filtered by plugCategoryIdentifier), plus class
 * and element reference lists — each exposed as a named range.
 * @param {ExcelJS.Workbook} workbook - Excel workbook
 * @param {object} buildData - Build crafting data
 */
function addLookupsSheet(workbook, buildData) {
  const sheet = workbook.addWorksheet('Lookups', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: theme.argb(GROUP_TAB_COLORS.Reference) } },
  });

  const byPlugCat = (keyword) =>
    [
      ...new Set(
        (buildData.abilities || [])
          .filter((item) =>
            (item.plug?.plugCategoryIdentifier || '').toLowerCase().includes(keyword)
          )
          .map((item) => item.displayProperties?.name || '')
          .filter(Boolean)
      ),
    ].sort();

  const lists = [
    { header: 'Supers', rangeName: 'SuperNames', values: byPlugCat('super') },
    { header: 'Grenades', rangeName: 'GrenadeNames', values: byPlugCat('grenade') },
    { header: 'Melees', rangeName: 'MeleeNames', values: byPlugCat('melee') },
    // "class_abilit" matches both class_ability and class_abilities identifiers
    { header: 'Class Abilities', rangeName: 'ClassAbilityNames', values: byPlugCat('class_abilit') },
    { header: 'Classes', rangeName: 'ClassNames', values: ['Titan', 'Hunter', 'Warlock'] },
    {
      header: 'Elements',
      rangeName: 'ElementNames',
      values: ['Arc', 'Solar', 'Void', 'Stasis', 'Strand', 'Prismatic', 'Kinetic'],
    },
  ];

  lists.forEach((list, i) => {
    const column = i + 1;
    sheet.getColumn(column).width = 30;
    const headerCell = sheet.getCell(1, column);
    headerCell.value = list.header;
    headerCell.fill = theme.solidFill(theme.HEADER_FILL);
    headerCell.font = theme.HEADER_FONT;
    list.values.forEach((value, r) => {
      sheet.getCell(r + 2, column).value = value;
    });
    if (list.values.length > 0) {
      const letter = String.fromCharCode(64 + column);
      workbook.definedNames.add(
        `'Lookups'!$${letter}$2:$${letter}$${list.values.length + 1}`,
        list.rangeName
      );
    }
  });
}

/**
 * Export all build crafting data to the compendium workbook.
 * Backwards-compatible signature: (buildData, filename, statDefs).
 * @param {object} buildData - Build crafting data object (from getAllBuildCraftingData)
 * @param {string} filename - Output filename
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
async function exportAllToExcel(buildData, filename, statDefs = null) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Destiny 2 Build Crafting Data Exporter';
    workbook.created = new Date();
    workbook.modified = new Date();
    resetTableNames();

    const curated = getCuratedSafe();
    const dataCtx = buildData.ctx || {};
    const ctx = {
      statDefs: statDefs || dataCtx.statDefs || null,
      subclassVerbs: curated?.subclassVerbs,
      itemDefs: dataCtx.itemDefs || {},
      plugSetDefs: dataCtx.plugSetDefs || {},
    };

    // ---- Pre-compute every dataset so the Cover TOC can be built first ----
    const fragmentMatrix = buildFragmentMatrix(buildData.fragments, ctx);
    const exoticArmor = buildExoticArmor(buildData.armor);
    const perkPoolRows = buildWeaponPerkPoolRows(buildData.weapons || [], ctx);
    const itemStatRows = buildItemStatRows(buildData);
    const itemPerkRows = buildItemPerkRows(buildData.weapons || [], ctx);
    const statRefRows = transformRows(generateStatReference(), 'statReference', ctx);
    const curatedSheets = curated ? curatedSheetSpecs(curated) : [];

    const catalogs = [];
    for (const key of CATALOG_ORDER) {
      const categoryDef = EXPORT_CATEGORIES.find((c) => c.key === key);
      const data = buildData[key];
      if (!categoryDef || !data || data.length === 0) continue;
      const rows = transformRows(data, categoryDef.category, ctx);
      catalogs.push({
        key,
        sheetName: categoryDef.sheetName,
        tabColor: categoryDef.tabColor,
        rows,
        columns: columnsForRows(categoryDef.category, rows),
      });
    }

    // ---- Cover sheet with full TOC (must be the first worksheet) ----
    const toc = [
      { sheetName: 'Build Planner', group: 'Planner' },
      { sheetName: 'Fragment Matrix', group: 'Mechanics', count: fragmentMatrix.rows.length },
      ...curatedSheets.map((spec) => ({
        sheetName: spec.sheetName,
        group: 'Mechanics',
        count: spec.rows.length,
      })),
      { sheetName: 'Stat Reference', group: 'Reference', count: statRefRows.length },
    ];
    for (const catalog of catalogs) {
      toc.push({ sheetName: catalog.sheetName, group: 'Catalog', count: catalog.rows.length });
      if (catalog.key === 'weapons') {
        toc.push({ sheetName: 'Weapon Perk Pools', group: 'Catalog', count: perkPoolRows.length });
      } else if (catalog.key === 'armor') {
        toc.push({ sheetName: 'Exotic Armor', group: 'Catalog', count: exoticArmor.rows.length });
      }
    }
    toc.push(
      { sheetName: 'Item_Stats', group: 'Reference', count: itemStatRows.length },
      { sheetName: 'Item_Perks', group: 'Reference', count: itemPerkRows.length },
      { sheetName: 'Lookups', group: 'Reference' }
    );

    addCoverSheet(workbook, {
      meta: {
        seasonName: dataCtx.season?.name,
        seasonNumber: dataCtx.season?.number,
        manifestVersion: dataCtx.manifestVersion,
      },
      toc,
    });

    // ---- Build Planner ----
    addBuildPlanner(workbook, { championCounters: curated?.championCounters || [] });

    // ---- Mechanics: Fragment Matrix + curated sheets ----
    writeTableSheet(workbook, {
      sheetName: 'Fragment Matrix',
      columns: fragmentMatrix.columns,
      rows: fragmentMatrix.rows,
      tabColor: GROUP_TAB_COLORS.Mechanics,
      signedStats: true,
      namedRanges: {
        FragMatrixNames: 'name',
        ...Object.fromEntries(PLANNER_STATS.map((s) => [`FragMatrix_${s}`, s])),
      },
    });
    for (const spec of curatedSheets) {
      writeTableSheet(workbook, { ...spec, tabColor: GROUP_TAB_COLORS.Mechanics });
    }

    // ---- Stat Reference ----
    writeTableSheet(workbook, {
      sheetName: 'Stat Reference',
      columns: columnsForRows('statReference', statRefRows),
      rows: statRefRows,
      tabColor: GROUP_TAB_COLORS.Reference,
    });

    // ---- Catalog sheets (Weapon Perk Pools after Weapons, Exotic Armor after Armor) ----
    for (const catalog of catalogs) {
      writeTableSheet(workbook, {
        sheetName: catalog.sheetName,
        columns: catalog.columns,
        rows: catalog.rows,
        tabColor: catalog.tabColor,
        signedStats: catalog.key === 'fragments',
        namedRanges: NAMED_RANGES[catalog.key],
      });
      if (catalog.key === 'weapons') {
        writeTableSheet(workbook, {
          sheetName: 'Weapon Perk Pools',
          columns: buildColumns(weaponPerkPoolsSchema, perkPoolRows),
          rows: perkPoolRows,
          tabColor: GROUP_TAB_COLORS.Catalog,
        });
      } else if (catalog.key === 'armor') {
        writeTableSheet(workbook, {
          sheetName: 'Exotic Armor',
          columns: exoticArmor.columns,
          rows: exoticArmor.rows,
          tabColor: GROUP_TAB_COLORS.Catalog,
          namedRanges: {
            ExoticArmorNames: 'name',
            ExoticArmorIntrinsics: 'intrinsic',
          },
        });
      }
    }

    // ---- Long-format reference sheets ----
    writeTableSheet(workbook, {
      sheetName: 'Item_Stats',
      columns: buildColumns(itemStatsSchema, itemStatRows),
      rows: itemStatRows,
      tabColor: GROUP_TAB_COLORS.Reference,
    });
    writeTableSheet(workbook, {
      sheetName: 'Item_Perks',
      columns: buildColumns(itemPerksSchema, itemPerkRows),
      rows: itemPerkRows,
      tabColor: GROUP_TAB_COLORS.Reference,
    });

    // ---- Lookups (planner dropdown source lists) ----
    addLookupsSheet(workbook, buildData);

    await workbook.xlsx.writeFile(filename);
    console.log(`\nExported compendium workbook to ${filename}`);
  } catch (error) {
    console.error('Error exporting to Excel:', error.message);
    throw error;
  }
}

/**
 * Export build crafting data to separate Excel files — backwards compatible.
 * @param {object} buildData - Build crafting data object
 * @param {string} outputDir - Output directory
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
async function exportAllToSeparateExcelFiles(buildData, outputDir, statDefs = null) {
  for (const { key, category, fileName } of EXPORT_CATEGORIES) {
    const data = key === 'statReference' ? generateStatReference() : buildData[key];
    if (data && data.length > 0) {
      const filename = path.join(outputDir, `${fileName}.xlsx`);
      await exportToExcel(data, filename, category, statDefs);
    }
  }
}

module.exports = {
  exportToExcel,
  exportAllToExcel,
  exportAllToSeparateExcelFiles,
  addWorksheet,
  buildFragmentMatrix,
  buildExoticArmor,
};
