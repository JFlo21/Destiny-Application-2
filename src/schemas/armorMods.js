/** Armor mods export schema. */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');
const { CANONICAL_ARMOR_STAT_ORDER } = require('../constants');

const columns = [
  ...baseIdentityColumns(),
  col('energyCost', 'Energy Cost', 12, { type: 'number', numFmt: '0' }),
  col('plugCategoryIdentifier', 'Plug Category', 32),
  col('statBonuses', 'Stat Bonuses', 32, { wrap: true }),
  ...baseMetadataColumns(),
];

module.exports = {
  key: 'armorMods',
  columns,
  statOrder: CANONICAL_ARMOR_STAT_ORDER,
  transform: makeTransform('armorMods'),
};
