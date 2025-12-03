const fs = require('fs');
const path = require('path');
const { createBungieClient } = require('./bungieClient');
const { getAllBuildCraftingData } = require('./buildCrafting');
const { loadStatDefinitions } = require('./buildCrafting');
const { exportAllToCSV } = require('./csvExport');
const { exportAllToExcel, exportAllToSeparateExcelFiles } = require('./excelExport');
const { exportToGoogleSheets } = require('./googleSheetsExport');

/**
 * Export build crafting data to JSON, CSV, Excel, and Google Sheets
 * @param {string} outputDir - Directory to save the files
 * @param {object} options - Export options
 * @param {boolean} options.json - Export JSON files (default: true)
 * @param {boolean} options.csv - Export CSV files (default: true)
 * @param {boolean} options.excel - Export Excel files (default: false)
 * @param {boolean} options.excelMaster - Export master Excel file with all data (default: false)
 * @param {boolean} options.googleSheets - Export to Google Sheets (default: false)
 * @param {string} options.googleSheetsCredentials - Path to Google Sheets credentials JSON file
 */
async function exportBuildCraftingData(outputDir = './data', options = { json: true, csv: true, excel: false, excelMaster: false, googleSheets: false }) {
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
    
    // Export to Google Sheets if requested
    let googleSheetsInfo = null;
    if (options.googleSheets) {
      console.log('\n=== Exporting to Google Sheets ===\n');
      
      try {
        // Load credentials from file or environment variable
        let credentials;
        if (options.googleSheetsCredentials && fs.existsSync(options.googleSheetsCredentials)) {
          const credentialsContent = fs.readFileSync(options.googleSheetsCredentials, 'utf-8');
          credentials = JSON.parse(credentialsContent);
        } else if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
          credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
        } else {
          console.error('Google Sheets credentials not found. Please provide credentials via:');
          console.error('  - --google-sheets-credentials <path-to-json-file>');
          console.error('  - GOOGLE_SHEETS_CREDENTIALS environment variable');
          throw new Error('Google Sheets credentials not found');
        }
        
        const sheetTitle = `Destiny 2 Build Data - ${new Date().toISOString().split('T')[0]}`;
        googleSheetsInfo = await exportToGoogleSheets(credentials, sheetTitle, buildData, statDefs);
        
        console.log('\nGoogle Sheets export completed successfully!');
        console.log(`Spreadsheet URL: ${googleSheetsInfo.spreadsheetUrl}`);
        
      } catch (error) {
        console.error('Failed to export to Google Sheets:', error.message);
        // Don't fail the entire export if Google Sheets fails
      }
    }
    
    // Create a summary file
    const summary = {
      exportDate: new Date().toISOString(),
      formats: {
        json: options.json,
        csv: options.csv,
        excel: options.excel,
        excelMaster: options.excelMaster,
        googleSheets: options.googleSheets
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
    
    if (googleSheetsInfo) {
      summary.googleSheets = googleSheetsInfo;
    }
    
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
  const options = { json: true, csv: true, excel: false, excelMaster: false, googleSheets: false };
  
  // Check for format flags
  if (args.includes('--json-only')) {
    options.json = true;
    options.csv = false;
    options.excel = false;
    options.excelMaster = false;
    options.googleSheets = false;
  } else if (args.includes('--csv-only')) {
    options.json = false;
    options.csv = true;
    options.excel = false;
    options.excelMaster = false;
    options.googleSheets = false;
  } else if (args.includes('--excel-only')) {
    options.json = false;
    options.csv = false;
    options.excel = true;
    options.excelMaster = false;
    options.googleSheets = false;
  } else if (args.includes('--excel-master')) {
    options.json = false;
    options.csv = false;
    options.excel = false;
    options.excelMaster = true;
    options.googleSheets = false;
  } else if (args.includes('--google-sheets')) {
    options.json = false;
    options.csv = false;
    options.excel = false;
    options.excelMaster = false;
    options.googleSheets = true;
  } else {
    // Default: export to JSON and CSV, add other formats if specific flags are present
    if (args.includes('--excel')) {
      options.excel = true;
    }
    if (args.includes('--excel-master')) {
      options.excelMaster = true;
    }
    if (args.includes('--google-sheets')) {
      options.googleSheets = true;
    }
  }
  
  // Check for Google Sheets credentials path
  const credentialsIndex = args.indexOf('--google-sheets-credentials');
  if (credentialsIndex !== -1 && args[credentialsIndex + 1]) {
    options.googleSheetsCredentials = args[credentialsIndex + 1];
  }
  
  // Get output directory (first non-flag argument, excluding credentials file)
  // Skip arguments that are flags (start with --) or follow the --google-sheets-credentials flag
  let outputDir = './data';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // Skip flags and their values
    if (arg.startsWith('--')) {
      // If this is --google-sheets-credentials, skip the next arg too (the file path)
      if (arg === '--google-sheets-credentials') {
        i++; // Skip the next argument (credentials file path)
      }
      continue;
    }
    // First non-flag argument is the output directory
    outputDir = arg;
    break;
  }
  
  exportBuildCraftingData(outputDir, options).catch(error => {
    console.error('Export failed:', error.message);
    process.exit(1);
  });
}

module.exports = { exportBuildCraftingData };
