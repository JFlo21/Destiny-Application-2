/**
 * Weapons export schema.
 * Stat columns (Impact, Range, ...) are dynamic and appended by
 * shared.buildColumns() in canonical weapon-stat order.
 */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');
const { CANONICAL_WEAPON_STAT_ORDER } = require('../constants');

const columns = [
  ...baseIdentityColumns(),
  col('weaponSlot', 'Slot', 10),
  col('damageType', 'Element', 10),
  col('damageTypeEnum', 'Element Enum', 12, { type: 'number', numFmt: '0' }),
  col('ammoType', 'Ammo', 10),
  col('intrinsicPerkName', 'Frame', 26),
  col('intrinsicPerkDescription', 'Frame Description', 50, { wrap: true }),
  col('breakerType', 'Breaker Type', 24),
  col('isAdept', 'Adept', 8, { type: 'boolean' }),
  col('perkNames', 'Perks', 40, { wrap: true }),
  ...baseMetadataColumns(),
];

module.exports = {
  key: 'weapons',
  columns,
  statOrder: CANONICAL_WEAPON_STAT_ORDER,
  transform: makeTransform('weapons'),
};
