/** Abilities (supers, grenades, melees, class abilities) export schema. */
const { col, baseIdentityColumns, baseMetadataColumns, makeTransform } = require('./shared');
const { matchVerbsInText } = require('../curated');

const columns = [
  ...baseIdentityColumns(),
  col('element', 'Element', 12),
  col('verbs', 'Verbs', 30, { wrap: true }),
  col('plugCategoryIdentifier', 'Plug Category', 40),
  ...baseMetadataColumns(),
];

const baseTransform = makeTransform('abilities');

module.exports = {
  key: 'abilities',
  columns,
  transform: (item, ctx = {}) => {
    const row = baseTransform(item, ctx);
    row.verbs = matchVerbsInText(row.description, ctx.subclassVerbs).join(', ');
    return row;
  },
};
