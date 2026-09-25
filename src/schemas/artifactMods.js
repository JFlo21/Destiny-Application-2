/** Seasonal artifact mods export schema. */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');

const columns = [
  ...baseIdentityColumns(),
  col('isCurrentSeason', 'Current Season', 14, { type: 'boolean' }),
  col('breakerType', 'Breaker Type', 24),
  col('energyCost', 'Energy Cost', 12, { type: 'number', numFmt: '0' }),
  col('plugCategoryIdentifier', 'Plug Category', 32),
  col('statBonuses', 'Stat Bonuses', 30, { wrap: true }),
  ...baseMetadataColumns(),
];

module.exports = {
  key: 'artifactMods',
  columns,
  transform: makeTransform('artifactMods'),
};
