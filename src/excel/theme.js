/**
 * Workbook theme: colors, fonts, and header styling for the
 * Destiny 2 Buildcraft Compendium workbook.
 */
const { ELEMENT_COLORS, RARITY_COLORS } = require('../constants');
const { GROUP_TAB_COLORS } = require('../categories');

/** Dark header fill with white bold text (Segoe UI, Calibri fallback) */
const HEADER_FILL = '1F1F1F';
const HEADER_FONT = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const BODY_FONT = { name: 'Segoe UI', size: 10 };

/** Light input-cell fill for the Build Planner form */
const INPUT_FILL = 'FFF7E7C1';
/** Section label fill for the Build Planner */
const SECTION_FILL = 'FF2F2F2F';
/** Red fill used to flag over-budget energy */
const WARNING_FILL = 'FFFFC7CE';

/**
 * Convert a 6-char RGB hex to an 8-char ARGB (fully opaque)
 * @param {string} rgb - e.g. '7AECF3'
 * @returns {string} - e.g. 'FF7AECF3'
 */
function argb(rgb) {
  return rgb.length === 8 ? rgb : `FF${rgb}`;
}

/**
 * Solid pattern fill helper
 * @param {string} rgb - 6- or 8-char hex
 * @returns {object} - exceljs fill object
 */
function solidFill(rgb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(rgb) } };
}

/**
 * Pick a readable font color (black/white) for a background color.
 * @param {string} rgb - 6-char hex background
 * @returns {string} - ARGB font color
 */
function contrastFontColor(rgb) {
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  // Perceptual luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 145 ? 'FF000000' : 'FFFFFFFF';
}

/**
 * Style the header row of a worksheet (dark fill, white bold text, frozen).
 * @param {object} worksheet - exceljs worksheet
 * @param {number} columnCount - Number of header cells to style
 */
function styleHeaderRow(worksheet, columnCount) {
  const headerRow = worksheet.getRow(1);
  for (let i = 1; i <= columnCount; i++) {
    const cell = headerRow.getCell(i);
    cell.fill = solidFill(HEADER_FILL);
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', wrapText: false };
  }
  headerRow.height = 20;
}

module.exports = {
  ELEMENT_COLORS,
  RARITY_COLORS,
  GROUP_TAB_COLORS,
  HEADER_FILL,
  HEADER_FONT,
  BODY_FONT,
  INPUT_FILL,
  SECTION_FILL,
  WARNING_FILL,
  argb,
  solidFill,
  contrastFontColor,
  styleHeaderRow,
};
