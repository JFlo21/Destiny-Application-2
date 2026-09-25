/**
 * Cover sheet: title, season/manifest metadata, color legend, per-category
 * counts, hyperlinked table of contents grouped by Reference / Catalog /
 * Mechanics / Planner, and a short Build Planner how-to.
 */
const theme = require('./theme');
const { ELEMENT_COLORS, RARITY_COLORS } = require('../constants');

/**
 * Add the Cover sheet to the workbook.
 * @param {object} workbook - exceljs workbook
 * @param {object} options
 * @param {object} options.meta - { seasonName, seasonNumber, manifestVersion }
 * @param {Array<{sheetName: string, group: string, count: number}>} options.toc - TOC entries in sheet order
 */
function addCoverSheet(workbook, { meta = {}, toc = [] }) {
  const sheet = workbook.addWorksheet('Cover', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: theme.argb(theme.GROUP_TAB_COLORS.Reference) } },
  });
  sheet.getColumn(1).width = 3;
  sheet.getColumn(2).width = 34;
  sheet.getColumn(3).width = 30;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 60;

  let rowIdx = 2;

  // Title block
  const title = sheet.getCell(rowIdx, 2);
  title.value = 'Destiny 2 Buildcraft Compendium';
  title.font = { name: 'Segoe UI', size: 22, bold: true, color: { argb: 'FF1F1F1F' } };
  rowIdx += 1;
  const subtitle = sheet.getCell(rowIdx, 2);
  subtitle.value = 'Manifest-driven buildcrafting workbook — data from the Bungie API plus curated mechanics';
  subtitle.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF666666' } };
  rowIdx += 2;

  // Metadata
  const metaRows = [
    ['Season', meta.seasonName ? `${meta.seasonName} (Season ${meta.seasonNumber ?? '?'})` : 'Unknown'],
    ['Manifest Version', meta.manifestVersion || 'Unknown'],
    ['Exported (UTC)', new Date().toISOString()],
    ['Requires', 'Excel 365 (Build Planner uses XLOOKUP and dynamic formulas)'],
  ];
  for (const [label, value] of metaRows) {
    sheet.getCell(rowIdx, 2).value = label;
    sheet.getCell(rowIdx, 2).font = { name: 'Segoe UI', bold: true, size: 10 };
    sheet.getCell(rowIdx, 3).value = value;
    sheet.getCell(rowIdx, 3).font = theme.BODY_FONT;
    rowIdx += 1;
  }
  rowIdx += 1;

  // Color legend
  sheet.getCell(rowIdx, 2).value = 'Color Legend';
  sheet.getCell(rowIdx, 2).font = { name: 'Segoe UI', bold: true, size: 12 };
  rowIdx += 1;
  const legendEntries = [
    ...Object.entries(ELEMENT_COLORS).map(([k, v]) => [`Element: ${k}`, v]),
    ...Object.entries(RARITY_COLORS).map(([k, v]) => [`Rarity: ${k}`, v]),
  ];
  for (const [label, color] of legendEntries) {
    const cell = sheet.getCell(rowIdx, 2);
    cell.value = label;
    cell.fill = theme.solidFill(color);
    cell.font = { name: 'Segoe UI', size: 10, color: { argb: theme.contrastFontColor(color) } };
    rowIdx += 1;
  }
  rowIdx += 1;

  // Table of contents, grouped
  sheet.getCell(rowIdx, 2).value = 'Table of Contents';
  sheet.getCell(rowIdx, 2).font = { name: 'Segoe UI', bold: true, size: 12 };
  rowIdx += 1;

  const groups = ['Planner', 'Mechanics', 'Reference', 'Catalog'];
  for (const group of groups) {
    const entries = toc.filter((t) => t.group === group);
    if (!entries.length) continue;
    const groupCell = sheet.getCell(rowIdx, 2);
    groupCell.value = group;
    groupCell.fill = theme.solidFill(theme.GROUP_TAB_COLORS[group] || '808080');
    groupCell.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    rowIdx += 1;
    for (const entry of entries) {
      const linkCell = sheet.getCell(rowIdx, 2);
      linkCell.value = { text: entry.sheetName, hyperlink: `#'${entry.sheetName}'!A1` };
      linkCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0563C1' }, underline: true };
      if (entry.count !== undefined) {
        const countCell = sheet.getCell(rowIdx, 3);
        countCell.value = entry.count;
        countCell.font = theme.BODY_FONT;
        countCell.numFmt = '#,##0';
      }
      rowIdx += 1;
    }
  }
  rowIdx += 1;

  // Build Planner how-to
  sheet.getCell(rowIdx, 2).value = 'How to use the Build Planner';
  sheet.getCell(rowIdx, 2).font = { name: 'Segoe UI', bold: true, size: 12 };
  rowIdx += 1;
  const howTo = [
    '1. Open the Build Planner tab and pick your Class, Subclass, Super, and abilities from the dropdowns.',
    '2. Choose up to 2 Aspects — the planner totals the fragment slots they grant.',
    '3. Pick Fragments; their stat bonuses/penalties are summed into your final stats automatically.',
    '4. Select your Exotic armor and weapons; descriptions appear beside each pick via XLOOKUP.',
    '5. Enter your base armor stats; final stats and tiers (=INT(stat/10)) update live.',
    '6. Check the Champion Coverage row to confirm Barrier/Overload/Unstoppable are handled.',
  ];
  for (const line of howTo) {
    sheet.getCell(rowIdx, 2).value = line;
    sheet.getCell(rowIdx, 2).font = theme.BODY_FONT;
    rowIdx += 1;
  }

  return sheet;
}

module.exports = { addCoverSheet };
