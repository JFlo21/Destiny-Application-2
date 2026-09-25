/** Stat reference schema (generated stat descriptions). */
const { col, makeTransform } = require('./shared');

const columns = [
  col('statName', 'Stat', 24),
  col('category', 'Category', 16),
  col('description', 'Description', 80, { wrap: true }),
  col('relevantFor', 'Relevant For', 45),
];

module.exports = {
  key: 'statReference',
  columns,
  transform: makeTransform('statReference'),
};
