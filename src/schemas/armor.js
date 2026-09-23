/**
 * Armor export schema.
 * Armor stat columns (Mobility..Strength, plus newer Weapons/Health/Class/
 * Grenade/Super/Melee names) are appended dynamically in canonical order.
 */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');
const { CANONICAL_ARMOR_STAT_ORDER } = require('../constants');

const columns = [
  ...baseIdentityColumns(),
  col('classType', 'Class', 10),
  col('energyCapacity', 'Energy Capacity', 14, { type: 'number', numFmt: '0' }),
  col('intrinsicPerkName', 'Intrinsic Perk', 26),
  col('intrinsicPerkDescription', 'Intrinsic Description', 50, { wrap: true }),
  col('modSocketCount', 'Mod Sockets', 12, { type: 'number', numFmt: '0' }),
  ...baseMetadataColumns(),
];

module.exports = {
  key: 'armor',
  columns,
  statOrder: CANONICAL_ARMOR_STAT_ORDER,
  transform: makeTransform('armor'),
};
