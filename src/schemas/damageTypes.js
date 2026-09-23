/** Damage types export schema (DestinyDamageTypeDefinition). */
const { col, baseIdentityColumns, makeTransform } = require('./shared');

const columns = [
  ...baseIdentityColumns(),
  col('enumValue', 'Enum', 8, { type: 'number', numFmt: '0' }),
  col('showIcon', 'Show Icon', 10, { type: 'boolean' }),
  col('transparentIconPath', 'Icon', 12, { type: 'url' }),
  col('hash', 'Hash', 14, { type: 'number', numFmt: '0' }),
];

module.exports = {
  key: 'damageTypes',
  columns,
  transform: makeTransform('damageTypes'),
};
