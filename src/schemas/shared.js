/**
 * Shared helpers for the per-category export schemas.
 *
 * A schema is `{ columns, transform(item, ctx) }`:
 * - columns: ordered array of { key, header, width, numFmt?, type?, wrap? }
 *   describing the fixed leading columns for the category.
 * - transform: converts a raw (enriched) manifest item into a flat row object.
 *
 * Stat columns are dynamic per item, so exporters must call buildColumns()
 * to compute the union of stat keys across ALL rows (fixing the old bug where
 * stats absent from row 1 were silently dropped).
 */
const { transformItemForCSV } = require('../csvExport');
const {
  CANONICAL_WEAPON_STAT_ORDER,
  CANONICAL_ARMOR_STAT_ORDER,
} = require('../constants');

/**
 * Column definition factory
 * @param {string} key - Row object key
 * @param {string} header - Excel/CSV header text
 * @param {number} width - Column width
 * @param {object} [opts] - { numFmt, type, wrap }
 * @returns {object} - Column definition
 */
function col(key, header, width = 18, opts = {}) {
  return { key, header, width, ...opts };
}

/**
 * Common identity columns shared by all item categories
 */
function baseIdentityColumns() {
  return [
    col('name', 'Name', 32),
    col('itemType', 'Type', 20),
    col('tierType', 'Rarity', 12),
    col('description', 'Description', 60, { wrap: true }),
  ];
}

/**
 * Common trailing metadata columns shared by all item categories
 */
function baseMetadataColumns() {
  return [
    col('flavorText', 'Flavor Text', 40, { wrap: true }),
    col('hash', 'Hash', 14, { type: 'number', numFmt: '0' }),
    col('seasonHash', 'Season Hash', 14, { type: 'number', numFmt: '0' }),
    col('iconUrl', 'Icon', 12, { type: 'url' }),
    col('screenshotUrl', 'Screenshot', 12, { type: 'url' }),
  ];
}

/**
 * Create a transform that delegates to transformItemForCSV, keeping the
 * legacy transformation behavior as the single source of row values.
 * @param {string} category - transformItemForCSV category key
 * @returns {function(object, object): object} - transform(item, ctx)
 */
function makeTransform(category) {
  return (item, ctx = {}) => transformItemForCSV(item, category, ctx.statDefs || null);
}

/**
 * Order dynamic stat keys: canonical order first, then alphabetical leftovers.
 * @param {string[]} statKeys - Stat column keys found across rows
 * @param {string[]} canonicalOrder - Canonical stat name order
 * @returns {string[]} - Ordered stat keys
 */
function orderStatKeys(statKeys, canonicalOrder) {
  const canonical = canonicalOrder.filter((name) => statKeys.includes(name));
  const rest = statKeys.filter((name) => !canonicalOrder.includes(name)).sort();
  return [...canonical, ...rest];
}

/**
 * Legacy/duplicate keys kept in CSV output for backwards compatibility but
 * omitted from Excel columns (spec Part 1 item 6: keep damageType +
 * damageTypeEnum, drop the duplicated name/enum variants and raw hashes).
 */
const EXCEL_EXCLUDED_KEYS = new Set([
  'damageTypeName',
  'defaultDamageType',
  'damageTypeDescription',
  'damageTypeHashes',
  'tierTypeHash',
  'itemTypeAndTierDisplayName',
  'itemSubType',
  'intrinsicPerkHash',
  'traitIds',
  'displaySource',
  'collectibleHash',
  'loreHash',
]);

/**
 * Build the final ordered column list for a set of transformed rows.
 * Fixed schema columns come first, then the union of stat keys in canonical
 * order, then any remaining unknown keys (alphabetical). No key is dropped.
 *
 * @param {object} schema - Schema with `columns` and optional `statOrder` / `exclude`
 * @param {object[]} rows - Transformed row objects
 * @returns {object[]} - Ordered array of column definitions
 */
function buildColumns(schema, rows) {
  // With no rows there is nothing to derive: keep the declared schema columns
  if (!rows || rows.length === 0) return [...schema.columns];

  const excluded = new Set([...EXCEL_EXCLUDED_KEYS, ...(schema.exclude || [])]);
  const fixedKeys = new Set(schema.columns.map((c) => c.key));

  // Union of every key present in any row
  const allKeys = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }

  // Fixed columns that actually appear in at least one row (or are declared always)
  const fixed = schema.columns.filter((c) => c.always || allKeys.has(c.key));

  const dynamicKeys = [...allKeys].filter((k) => !fixedKeys.has(k));
  const canonicalOrder = schema.statOrder || [
    ...CANONICAL_ARMOR_STAT_ORDER,
    ...CANONICAL_WEAPON_STAT_ORDER,
  ];
  // Stat keys are those matching a canonical stat name or a _Max companion
  const isStatKey = (k) =>
    canonicalOrder.includes(k) || canonicalOrder.includes(k.replace(/_Max$/, ''));
  const statKeys = orderStatKeys(dynamicKeys.filter(isStatKey), canonicalOrder)
    // keep "<Stat>" followed directly by "<Stat>_Max"
    .flatMap((k) => (dynamicKeys.includes(`${k}_Max`) ? [k, `${k}_Max`] : [k]));
  const otherKeys = dynamicKeys
    .filter((k) => !isStatKey(k) && !statKeys.includes(k))
    .filter((k) => k !== 'undefined' && !excluded.has(k))
    .sort();

  const statCols = statKeys.map((k) =>
    col(k, k, Math.max(9, Math.min(k.length + 2, 24)), { type: 'number', numFmt: '0', isStat: !k.endsWith('_Max') })
  );
  const otherCols = otherKeys.map((k) => col(k, k, 20));

  return [...fixed, ...statCols, ...otherCols];
}

module.exports = {
  col,
  baseIdentityColumns,
  baseMetadataColumns,
  makeTransform,
  orderStatKeys,
  buildColumns,
};
