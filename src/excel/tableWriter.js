/**
 * Table writer: renders a data sheet as a real Excel Table with
 * frozen header/first column, typed cells, hyperlinks, conditional
 * formatting, and named ranges for key lookup columns.
 */
const theme = require('./theme');
const { ELEMENT_COLORS, RARITY_COLORS } = require('../constants');

const usedTableNames = new Set();

/** Reset the per-workbook table-name registry (call before each workbook). */
function resetTableNames() {
  usedTableNames.clear();
}

/**
 * Sanitize an Excel sheet name: strip []:*?/\ and cap at 31 chars.
 * @param {string} name - Proposed sheet name
 * @returns {string} - Valid sheet name
 */
function sanitizeSheetName(name) {
  const cleaned = String(name).replace(/[[\]:*?/\\]/g, '').trim() || 'Sheet';
  return cleaned.slice(0, 31);
}

/**
 * Sanitize an Excel table name: letters/digits/underscore only, must not
 * start with a digit, unique within the workbook.
 * @param {string} name - Proposed table name
 * @returns {string} - Valid, unique table name
 */
function sanitizeTableName(name) {
  let cleaned = String(name).replace(/[^A-Za-z0-9_]/g, '');
  if (!cleaned || /^\d/.test(cleaned)) cleaned = `tbl${cleaned}`;
  let unique = cleaned;
  let i = 2;
  while (usedTableNames.has(unique)) {
    unique = `${cleaned}_${i++}`;
  }
  usedTableNames.add(unique);
  return unique;
}

/**
 * Coerce a raw row value based on the column's declared type.
 * Numbers become numbers, booleans real booleans, URLs hyperlink objects.
 * @param {*} value - Raw value
 * @param {object} column - Column definition ({ type })
 * @returns {*} - Typed cell value
 */
function typedValue(value, column) {
  if (value === undefined || value === null || value === '') return null;
  switch (column.type) {
    case 'number': {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 'TRUE') return true;
      if (value === 'false' || value === 'FALSE') return false;
      return Boolean(value);
    case 'url': {
      const text = String(value);
      return /^https?:\/\//i.test(text) ? { text: 'link', hyperlink: text } : text;
    }
    default:
      // Auto-type: keep numbers/booleans; everything else becomes a string
      if (typeof value === 'number' || typeof value === 'boolean') return value;
      return String(value);
  }
}

/**
 * Convert a 1-based column index to an A1 letter (1 -> A, 27 -> AA).
 * @param {number} index - 1-based column index
 * @returns {string}
 */
function columnLetter(index) {
  let letters = '';
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/**
 * Add conditional formatting rules for a written table:
 * - 3-color scale (0-100) on stat columns
 * - rarity fills on Rarity columns
 * - element fills on Element columns
 * - signed green/red deltas on fragment stat columns
 * @param {object} worksheet - exceljs worksheet
 * @param {object[]} columns - Column definitions
 * @param {number} rowCount - Number of data rows
 * @param {object} [opts] - { signedStats } for fragment-style +/- coloring
 */
function applyConditionalFormatting(worksheet, columns, rowCount, opts = {}) {
  if (rowCount === 0) return;
  const firstDataRow = 2;
  const lastDataRow = rowCount + 1;

  columns.forEach((column, i) => {
    const letter = columnLetter(i + 1);
    const ref = `${letter}${firstDataRow}:${letter}${lastDataRow}`;

    if (column.isStat && !opts.signedStats) {
      // 3-color scale for 0-100 stats
      worksheet.addConditionalFormatting({
        ref,
        rules: [
          {
            type: 'colorScale',
            priority: 10,
            cfvo: [
              { type: 'num', value: 0 },
              { type: 'num', value: 50 },
              { type: 'num', value: 100 },
            ],
            color: [{ argb: 'FFF8696B' }, { argb: 'FFFFEB84' }, { argb: 'FF63BE7B' }],
          },
        ],
      });
    } else if (column.isStat && opts.signedStats) {
      // Fragment stat deltas: positive green, negative red
      worksheet.addConditionalFormatting({
        ref,
        rules: [
          {
            type: 'cellIs',
            operator: 'greaterThan',
            formulae: [0],
            priority: 11,
            style: { fill: theme.solidFill('C6EFCE'), font: { color: { argb: 'FF006100' } } },
          },
          {
            type: 'cellIs',
            operator: 'lessThan',
            formulae: [0],
            priority: 12,
            style: { fill: theme.solidFill('FFC7CE'), font: { color: { argb: 'FF9C0006' } } },
          },
        ],
      });
    }

    if (column.key === 'tierType' || column.header === 'Rarity') {
      // Rarity fills
      const rules = Object.entries(RARITY_COLORS).map(([rarity, color], idx) => ({
        type: 'containsText',
        operator: 'containsText',
        text: rarity,
        priority: 20 + idx,
        style: {
          fill: theme.solidFill(color),
          font: { color: { argb: theme.contrastFontColor(color) } },
        },
      }));
      worksheet.addConditionalFormatting({ ref, rules });
    }

    if (
      column.header === 'Element' ||
      ['element', 'damageType', 'damageTypeName'].includes(column.key)
    ) {
      // Element fills
      const rules = Object.entries(ELEMENT_COLORS).map(([element, color], idx) => ({
        type: 'containsText',
        operator: 'containsText',
        text: element,
        priority: 40 + idx,
        style: {
          fill: theme.solidFill(color),
          font: { color: { argb: theme.contrastFontColor(color) } },
        },
      }));
      worksheet.addConditionalFormatting({ ref, rules });
    }

    if (column.key === 'energyCost') {
      // Energy > 10 is impossible on a single piece — flag red
      worksheet.addConditionalFormatting({
        ref,
        rules: [
          {
            type: 'cellIs',
            operator: 'greaterThan',
            formulae: [10],
            priority: 60,
            style: { fill: theme.solidFill('FFC7CE') },
          },
        ],
      });
    }
  });
}

/**
 * Write a data sheet as an Excel Table.
 *
 * @param {object} workbook - exceljs workbook
 * @param {object} options
 * @param {string} options.sheetName - Desired sheet name (sanitized)
 * @param {object[]} options.columns - Ordered column definitions from the schema
 * @param {object[]} options.rows - Transformed row objects
 * @param {string} [options.tabColor] - 6-char hex tab color
 * @param {object} [options.namedRanges] - { rangeName: columnKey } named ranges to define
 * @param {boolean} [options.signedStats] - Use +/- coloring instead of a color scale
 * @returns {object} - The created worksheet
 */
function writeTableSheet(workbook, { sheetName, columns, rows, tabColor, namedRanges, signedStats }) {
  const name = sanitizeSheetName(sheetName);
  if (!columns || columns.length === 0) {
    // Nothing to render: create an empty placeholder sheet instead of a table
    const empty = workbook.addWorksheet(name);
    empty.getCell('A1').value = 'No data';
    return empty;
  }
  const worksheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
    properties: tabColor ? { tabColor: { argb: theme.argb(tabColor) } } : undefined,
  });

  // Column widths, wrap and number formats come from the schema
  worksheet.columns = columns.map((c) => ({
    key: c.key,
    width: c.width || 18,
    style: {
      font: theme.BODY_FONT,
      ...(c.numFmt ? { numFmt: c.numFmt } : {}),
      ...(c.wrap ? { alignment: { wrapText: true, vertical: 'top' } } : {}),
    },
  }));

  const tableRows = rows.map((row) => columns.map((c) => typedValue(row[c.key], c)));

  worksheet.addTable({
    name: sanitizeTableName(`tbl${sheetName.replace(/\s+/g, '')}`),
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: columns.map((c) => ({ name: c.header, filterButton: true })),
    rows: tableRows.length ? tableRows : [columns.map(() => null)],
  });

  theme.styleHeaderRow(worksheet, columns.length);
  applyConditionalFormatting(worksheet, columns, rows.length, { signedStats });

  // Named ranges for key lookup columns (used by Build Planner formulas)
  if (namedRanges && rows.length > 0) {
    for (const [rangeName, columnKey] of Object.entries(namedRanges)) {
      const colIndex = columns.findIndex((c) => c.key === columnKey);
      if (colIndex === -1) continue;
      const letter = columnLetter(colIndex + 1);
      workbook.definedNames.add(`'${name}'!$${letter}$2:$${letter}$${rows.length + 1}`, rangeName);
    }
  }

  return worksheet;
}

module.exports = {
  writeTableSheet,
  sanitizeSheetName,
  sanitizeTableName,
  typedValue,
  columnLetter,
  applyConditionalFormatting,
  resetTableNames,
};
