/**
 * Fragments export schema.
 * Stat columns hold the signed stat deltas fragments grant (e.g. -10 Recovery);
 * verbs are keyword-matched from the curated subclass verb list.
 */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');
const { CANONICAL_ARMOR_STAT_ORDER } = require('../constants');
const { matchVerbsInText } = require('../curated');

const columns = [
  ...baseIdentityColumns(),
  col('element', 'Element', 12),
  col('verbs', 'Verbs', 30, { wrap: true }),
  col('statBonuses', 'Stat Bonuses', 30, { wrap: true }),
  col('plugCategoryIdentifier', 'Plug Category', 32),
  ...baseMetadataColumns(),
];

const baseTransform = makeTransform('fragments');

module.exports = {
  key: 'fragments',
  columns,
  statOrder: CANONICAL_ARMOR_STAT_ORDER,
  transform: (item, ctx = {}) => {
    const row = baseTransform(item, ctx);
    row.verbs = matchVerbsInText(row.description, ctx.subclassVerbs).join(', ');
    return row;
  },
};
