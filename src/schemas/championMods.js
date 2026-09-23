/** Champion mods export schema (breaker-type stunning mods only). */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');

const columns = [
  ...baseIdentityColumns(),
  col('breakerType', 'Breaker Type', 24),
  col('isCurrentSeason', 'Current Season', 14, { type: 'boolean' }),
  col('energyCost', 'Energy Cost', 12, { type: 'number', numFmt: '0' }),
  col('plugCategoryIdentifier', 'Plug Category', 32),
  ...baseMetadataColumns(),
];

module.exports = {
  key: 'championMods',
  columns,
  transform: makeTransform('championMods'),
};
