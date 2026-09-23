/**
 * Schema registry: one schema per export category, plus long-format schemas.
 * Every exporter (CSV, Excel, Google Sheets) resolves columns/transforms here.
 */
const weapons = require('./weapons');
const armor = require('./armor');
const armorMods = require('./armorMods');
const subclasses = require('./subclasses');
const aspects = require('./aspects');
const fragments = require('./fragments');
const abilities = require('./abilities');
const artifactMods = require('./artifactMods');
const championMods = require('./championMods');
const damageTypes = require('./damageTypes');
const enemyWeaknesses = require('./enemyWeaknesses');
const statReference = require('./statReference');
const longFormat = require('./longFormat');
const { buildColumns, col } = require('./shared');

const SCHEMAS = {
  weapons,
  armor,
  armorMods,
  subclasses,
  aspects,
  fragments,
  abilities,
  artifactMods,
  championMods,
  damageTypes,
  enemyWeaknesses,
  statReference,
  itemStats: longFormat.itemStats,
  itemPerks: longFormat.itemPerks,
  weaponPerkPools: longFormat.weaponPerkPools,
};

/**
 * Get the schema for a category key.
 * @param {string} category - Category key (e.g. 'weapons')
 * @returns {object|null} - Schema or null when the category has no schema
 */
function getSchema(category) {
  return SCHEMAS[category] || null;
}

/**
 * Transform raw items into rows using the category schema (falls back to
 * identity when no schema exists).
 * @param {object[]} items - Raw items
 * @param {string} category - Category key
 * @param {object} ctx - Transform context ({ statDefs, subclassVerbs, ... })
 * @returns {object[]} - Transformed rows
 */
function transformRows(items, category, ctx = {}) {
  const schema = getSchema(category);
  if (!schema || !schema.transform) return items;
  return items.map((item) => schema.transform(item, ctx));
}

/**
 * Compute the full ordered column list for transformed rows of a category.
 * @param {string} category - Category key
 * @param {object[]} rows - Transformed rows
 * @returns {object[]} - Ordered column definitions
 */
function columnsForRows(category, rows) {
  const schema = getSchema(category);
  if (schema) return buildColumns(schema, rows);
  // No schema: derive plain columns from the union of row keys
  const keys = new Set();
  rows.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
  return [...keys].map((k) => col(k, k, 20));
}

module.exports = {
  SCHEMAS,
  getSchema,
  transformRows,
  columnsForRows,
  ...longFormat,
};
