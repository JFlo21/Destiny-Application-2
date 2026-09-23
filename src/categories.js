/**
 * Single source of truth for export categories.
 * Used by the CSV, Excel, and Google Sheets exporters so the four previously
 * duplicated category arrays stay in sync.
 *
 * group values:
 * - Reference: lookup/reference data (grey tabs)
 * - Catalog:   manifest item catalogs (blue tabs)
 * - Mechanics: curated mechanics knowledge (orange tabs)
 * - Planner:   interactive sheets (green tabs)
 */
const GROUP_TAB_COLORS = {
  Reference: '808080', // grey
  Catalog: '4472C4', // blue
  Mechanics: 'ED7D31', // orange
  Planner: '70AD47', // green
};

/**
 * Ordered list of data-driven export categories.
 * `key` matches the property name on the buildData object,
 * `category` matches the transform category used by transformItemForCSV.
 */
const EXPORT_CATEGORIES = [
  { key: 'statReference', category: 'statReference', sheetName: 'Stat Reference', fileName: 'stat-reference', group: 'Reference' },
  { key: 'weapons', category: 'weapons', sheetName: 'Weapons', fileName: 'weapons', group: 'Catalog' },
  { key: 'armor', category: 'armor', sheetName: 'Armor', fileName: 'armor', group: 'Catalog' },
  { key: 'armorMods', category: 'armorMods', sheetName: 'Armor Mods', fileName: 'armor-mods', group: 'Catalog' },
  { key: 'subclasses', category: 'subclasses', sheetName: 'Subclasses', fileName: 'subclasses', group: 'Catalog' },
  { key: 'aspects', category: 'aspects', sheetName: 'Aspects', fileName: 'aspects', group: 'Catalog' },
  { key: 'fragments', category: 'fragments', sheetName: 'Fragments', fileName: 'fragments', group: 'Catalog' },
  { key: 'abilities', category: 'abilities', sheetName: 'Abilities', fileName: 'abilities', group: 'Catalog' },
  { key: 'damageTypes', category: 'damageTypes', sheetName: 'Damage Types', fileName: 'damage-types', group: 'Reference' },
  { key: 'artifactMods', category: 'artifactMods', sheetName: 'Artifact Mods', fileName: 'artifact-mods', group: 'Catalog' },
  { key: 'championMods', category: 'championMods', sheetName: 'Champion Mods', fileName: 'champion-mods', group: 'Catalog' },
  { key: 'enemyWeaknesses', category: 'enemyWeaknesses', sheetName: 'Enemy Weaknesses', fileName: 'enemy-weaknesses', group: 'Reference' },
].map((c) => ({ ...c, tabColor: GROUP_TAB_COLORS[c.group] }));

module.exports = { EXPORT_CATEGORIES, GROUP_TAB_COLORS };
