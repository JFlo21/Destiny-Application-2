const fs = require('fs');
const path = require('path');
const { createBungieClient } = require('./bungieClient');
const { getAllBuildCraftingData } = require('./buildCrafting');
const { loadStatDefinitions } = require('./buildCrafting');
const { exportAllToCSV } = require('./csvExport');
const { exportAllToExcel, exportAllToSeparateExcelFiles } = require('./excelExport');

/**
 * Export build crafting data to JSON, CSV, and Excel files
 * @param {string} outputDir - Directory to save the files
 * @param {object} options - Export options
 * @param {boolean} options.json - Export JSON files (default: true)
 * @param {boolean} options.csv - Export CSV files (default: true)
 * @param {boolean} options.excel - Export Excel files (default: false)
 * @param {boolean} options.excelMaster - Export master Excel file with all data (default: false)
 */
async function exportBuildCraftingData(outputDir = './data', options = { json: true, csv: true, excel: false, excelMaster: false }) {
  const apiKey = process.env.BUNGIE_API_KEY;
  
  if (!apiKey) {
    console.error('Error: BUNGIE_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  console.log('Destiny 2 Build Crafting Data Exporter');
  console.log('======================================\n');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    const client = createBungieClient(apiKey);
    const buildData = await getAllBuildCraftingData(client);
    
    // Load stat definitions for resolving stat hashes
    console.log('\nLoading stat definitions for CSV export...');
    const statDefs = await loadStatDefinitions(client);
    console.log('Stat definitions loaded');
    
    // Export to JSON if requested
    if (options.json) {
      console.log('\n=== Exporting to JSON ===\n');
      const exports = [
        { name: 'weapons', data: buildData.weapons },
        { name: 'armor', data: buildData.armor },
        { name: 'armor-mods', data: buildData.armorMods },
        { name: 'subclasses', data: buildData.subclasses },
        { name: 'aspects', data: buildData.aspects },
        { name: 'fragments', data: buildData.fragments },
        { name: 'abilities', data: buildData.abilities }
      ];
      
      for (const { name, data } of exports) {
        const filename = path.join(outputDir, `${name}.json`);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`Exported ${data.length} ${name} to ${filename}`);
      }
    }
    
    // Export to CSV if requested
    if (options.csv) {
      console.log('\n=== Exporting to CSV ===\n');
      exportAllToCSV(buildData, outputDir, statDefs);
    }
    
    // Export to Excel if requested
    if (options.excel) {
      console.log('\n=== Exporting to Excel (separate files) ===\n');
      await exportAllToSeparateExcelFiles(buildData, outputDir, statDefs);
    }
    
    // Export to master Excel file if requested
    if (options.excelMaster) {
      console.log('\n=== Exporting to Master Excel File ===\n');
      const masterFilename = path.join(outputDir, 'destiny2-build-data-master.xlsx');
      await exportAllToExcel(buildData, masterFilename, statDefs);
    }
    
    // Create a summary file
    const summary = {
      exportDate: new Date().toISOString(),
      formats: {
        json: options.json,
        csv: options.csv,
        excel: options.excel,
        excelMaster: options.excelMaster
      },
      counts: {
        weapons: buildData.weapons.length,
        armor: buildData.armor.length,
        armorMods: buildData.armorMods.length,
        subclasses: buildData.subclasses.length,
        aspects: buildData.aspects.length,
        fragments: buildData.fragments.length,
        abilities: buildData.abilities.length
      }
    };
    
    const summaryFilename = path.join(outputDir, 'summary.json');
    fs.writeFileSync(summaryFilename, JSON.stringify(summary, null, 2));
    console.log(`\nExport summary saved to ${summaryFilename}`);
    
    console.log('\n=== Export Complete ===');
    console.log(`All data exported to: ${path.resolve(outputDir)}`);
    
    return summary;
    
  } catch (error) {
    console.error('Error exporting data:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  // Parse command line options
  const args = process.argv.slice(2);
  const options = { json: true, csv: true, excel: false, excelMaster: false };
  
  // Check for format flags
  if (args.includes('--json-only')) {
    options.json = true;
    options.csv = false;
    options.excel = false;
    options.excelMaster = false;
  } else if (args.includes('--csv-only')) {
    options.json = false;
    options.csv = true;
    options.excel = false;
    options.excelMaster = false;
  } else if (args.includes('--excel-only')) {
    options.json = false;
    options.csv = false;
    options.excel = true;
    options.excelMaster = false;
  } else if (args.includes('--excel-master')) {
    options.json = false;
    options.csv = false;
    options.excel = false;
    options.excelMaster = true;
  } else {
    // Default: export to all formats if specific flags are present
    if (args.includes('--excel')) {
      options.excel = true;
    }
    if (args.includes('--excel-master')) {
      options.excelMaster = true;
    }
  }
  
  // Get output directory (first non-flag argument or default)
  const outputDir = args.find(arg => !arg.startsWith('--')) || './data';
  
  exportBuildCraftingData(outputDir, options).catch(error => {
    console.error('Export failed:', error.message);
    process.exit(1);
  });
}

module.exports = { exportBuildCraftingData };
