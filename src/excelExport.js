const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { transformItemsForCSV } = require('./csvExport');

/**
 * Export data to Excel worksheet
 * @param {ExcelJS.Workbook} workbook - Excel workbook
 * @param {string} sheetName - Name of the worksheet
 * @param {object[]} data - Array of objects to export
 * @param {string} category - Category name for transformation
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
function addWorksheet(workbook, sheetName, data, category, statDefs = null) {
  if (!data || data.length === 0) {
    console.log(`Skipping empty sheet: ${sheetName}`);
    return;
  }

  // Transform the data to be more readable
  const transformedData = transformItemsForCSV(data, category, statDefs);
  
  // Create worksheet
  const worksheet = workbook.addWorksheet(sheetName);
  
  // Get column names from the first item
  const columns = Object.keys(transformedData[0]).map(key => ({
    header: key,
    key: key,
    width: 20
  }));
  
  worksheet.columns = columns;
  
  // Add rows
  transformedData.forEach(item => {
    worksheet.addRow(item);
  });
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };
  
  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: transformedData.length + 1, column: columns.length }
  };
  
  console.log(`Added sheet "${sheetName}" with ${data.length} items`);
}

/**
 * Export data to Excel file (.xlsx)
 * @param {object[]} data - Array of objects to export
 * @param {string} filename - Output filename
 * @param {string} category - Category name for transformation
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
async function exportToExcel(data, filename, category, statDefs = null) {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Destiny 2 Build Crafting Data Exporter';
    workbook.created = new Date();
    
    // Add worksheet
    addWorksheet(workbook, category, data, category, statDefs);
    
    // Write to file
    await workbook.xlsx.writeFile(filename);
    console.log(`Exported ${data.length} ${category} to ${filename}`);
    
  } catch (error) {
    console.error(`Error exporting ${category} to Excel:`, error.message);
    throw error;
  }
}

/**
 * Export all build crafting data to a single Excel file with multiple worksheets
 * @param {object} buildData - Build crafting data object
 * @param {string} filename - Output filename
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
async function exportAllToExcel(buildData, filename, statDefs = null) {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Destiny 2 Build Crafting Data Exporter';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add worksheets for each category
    const worksheets = [
      { name: 'Weapons', data: buildData.weapons, category: 'weapons' },
      { name: 'Armor', data: buildData.armor, category: 'armor' },
      { name: 'Armor Mods', data: buildData.armorMods, category: 'armorMods' },
      { name: 'Subclasses', data: buildData.subclasses, category: 'subclasses' },
      { name: 'Aspects', data: buildData.aspects, category: 'aspects' },
      { name: 'Fragments', data: buildData.fragments, category: 'fragments' },
      { name: 'Abilities', data: buildData.abilities, category: 'abilities' },
      { name: 'Damage Types', data: buildData.damageTypes, category: 'damageTypes' },
      { name: 'Artifact Mods', data: buildData.artifactMods, category: 'artifactMods' },
      { name: 'Champion Mods', data: buildData.championMods, category: 'championMods' }
    ];
    
    for (const { name, data, category } of worksheets) {
      if (data && data.length > 0) {
        addWorksheet(workbook, name, data, category, statDefs);
      }
    }
    
    // Write to file
    await workbook.xlsx.writeFile(filename);
    console.log(`\nExported all data to ${filename}`);
    
  } catch (error) {
    console.error('Error exporting to Excel:', error.message);
    throw error;
  }
}

/**
 * Export build crafting data to separate Excel files
 * @param {object} buildData - Build crafting data object
 * @param {string} outputDir - Output directory
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
async function exportAllToSeparateExcelFiles(buildData, outputDir, statDefs = null) {
  const exports = [
    { name: 'weapons', data: buildData.weapons, category: 'weapons' },
    { name: 'armor', data: buildData.armor, category: 'armor' },
    { name: 'armor-mods', data: buildData.armorMods, category: 'armorMods' },
    { name: 'subclasses', data: buildData.subclasses, category: 'subclasses' },
    { name: 'aspects', data: buildData.aspects, category: 'aspects' },
    { name: 'fragments', data: buildData.fragments, category: 'fragments' },
    { name: 'abilities', data: buildData.abilities, category: 'abilities' },
    { name: 'damage-types', data: buildData.damageTypes, category: 'damageTypes' },
    { name: 'artifact-mods', data: buildData.artifactMods, category: 'artifactMods' },
    { name: 'champion-mods', data: buildData.championMods, category: 'championMods' }
  ];
  
  for (const { name, data, category } of exports) {
    if (data && data.length > 0) {
      const filename = path.join(outputDir, `${name}.xlsx`);
      await exportToExcel(data, filename, category, statDefs);
    }
  }
}

module.exports = {
  exportToExcel,
  exportAllToExcel,
  exportAllToSeparateExcelFiles,
  addWorksheet
};
