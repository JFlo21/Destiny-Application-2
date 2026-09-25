/** Enemy weaknesses reference schema (curated community data, see enemyWeaknesses.js). */
const { col, makeTransform } = require('./shared');

const columns = [
  col('faction', 'Faction', 16),
  col('enemyType', 'Enemy Type', 22),
  col('shieldType', 'Shield Type', 14),
  col('effectiveDamageType', 'Effective Element', 16),
  col('damageTypeEnum', 'Element Enum', 12, { type: 'number', numFmt: '0' }),
  col('notes', 'Notes', 70, { wrap: true }),
];

module.exports = {
  key: 'enemyWeaknesses',
  columns,
  transform: makeTransform('enemyWeaknesses'),
};
