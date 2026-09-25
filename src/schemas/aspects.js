/**
 * Aspects export schema.
 * fragmentSlots is derived from investmentStats (stat hash 2223994109,
 * "Fragment Slots") in transformItemForCSV; verbs are keyword-matched from
 * the curated subclass verb list.
 */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');
const { matchVerbsInText } = require('../curated');

const columns = [
  ...baseIdentityColumns(),
  col('element', 'Element', 12),
  col('fragmentSlots', 'Fragment Slots', 14, { type: 'number', numFmt: '0' }),
  col('verbs', 'Verbs', 30, { wrap: true }),
  col('plugCategoryIdentifier', 'Plug Category', 32),
  ...baseMetadataColumns(),
];

const baseTransform = makeTransform('aspects');

module.exports = {
  key: 'aspects',
  columns,
  transform: (item, ctx = {}) => {
    const row = baseTransform(item, ctx);
    row.verbs = matchVerbsInText(row.description, ctx.subclassVerbs).join(', ');
    return row;
  },
};
