/** Subclasses export schema. */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');

const columns = [
  ...baseIdentityColumns(),
  col('classType', 'Class', 10),
  col('damageType', 'Element', 12),
  col('damageTypeEnum', 'Element Enum', 12, { type: 'number', numFmt: '0' }),
  ...baseMetadataColumns(),
];

module.exports = {
  key: 'subclasses',
  columns,
  transform: makeTransform('subclasses'),
};
