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
    // Honor --no-cache: disable the on-disk manifest cache
    const { setCacheEnabled } = require('./manifest');
    setCacheEnabled(options.cache !== false);

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
        { name: 'abilities', data: buildData.abilities },
        { name: 'damage-types', data: buildData.damageTypes },
        { name: 'artifact-mods', data: buildData.artifactMods },
        { name: 'champion-mods', data: buildData.championMods },
        { name: 'enemy-weaknesses', data: buildData.enemyWeaknesses }
      ];
      
      for (const { name, data } of exports) {
        if (data && data.length > 0) {
          const filename = path.join(outputDir, `${name}.json`);
          fs.writeFileSync(filename, JSON.stringify(data, null, 2));
          console.log(`Exported ${data.length} ${name} to ${filename}`);
        }
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
    
    // Export to master Excel file (compendium workbook) if requested
    if (options.excelMaster) {
      console.log('\n=== Exporting to Compendium Excel Workbook ===\n');
      const compendiumFilename = path.join(outputDir, 'destiny2-buildcraft-compendium.xlsx');
      await exportAllToExcel(buildData, compendiumFilename, statDefs);
      // Keep the old filename as a copy for backwards compatibility
      const legacyFilename = path.join(outputDir, 'destiny2-build-data-master.xlsx');
      fs.copyFileSync(compendiumFilename, legacyFilename);
      console.log(`Copied compendium to legacy filename: ${legacyFilename}`);
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
        abilities: buildData.abilities.length,
        damageTypes: buildData.damageTypes.length,
        artifactMods: buildData.artifactMods.length,
        championMods: buildData.championMods.length,
        enemyWeaknesses: buildData.enemyWeaknesses.length
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
  const { options, outputDir } = parseCliArgs(process.argv.slice(2));

  exportBuildCraftingData(outputDir, options).catch(error => {
    console.error('Export failed:', error.message);
    process.exit(1);
  });
}

/**
 * Parse CLI arguments into export options + output directory.
 *
 * Rules:
 * - `--json-only` / `--csv-only` / `--excel-only` / `--google-sheets-only` select a single format.
 * - `--excel`, `--excel-master` (alias `--excel-compendium`), `--google-sheets` are additive
 *   and can be combined freely (fixes the old bug where `--excel --excel-master` only enabled one).
 * - `--no-cache` disables the on-disk manifest cache.
 * - The first non-flag argument is the output directory.
 * @param {string[]} args - process.argv.slice(2)
 * @returns {{options: object, outputDir: string}}
 */
function parseCliArgs(args) {
  const options = { json: true, csv: true, excel: false, excelMaster: false, googleSheets: false, cache: true };

  const onlyFlags = {
    '--json-only': 'json',
    '--csv-only': 'csv',
    '--excel-only': 'excel',
    '--google-sheets-only': 'googleSheets',
  };

  let outputDir = './data';
  let outputDirSet = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (onlyFlags[arg]) {
      options.json = false;
      options.csv = false;
      options.excel = false;
      options.excelMaster = false;
      options.googleSheets = false;
      options[onlyFlags[arg]] = true;
    } else if (arg === '--excel') {
      options.excel = true;
    } else if (arg === '--excel-master' || arg === '--excel-compendium') {
      options.excelMaster = true;
    } else if (arg === '--google-sheets') {
      options.googleSheets = true;
    } else if (arg === '--no-cache') {
      options.cache = false;
    } else if (arg === '--google-sheets-credentials') {
      if (args[i + 1]) {
        options.googleSheetsCredentials = args[i + 1];
        i++; // Skip the credentials path value
      }
    } else if (!arg.startsWith('--') && !outputDirSet) {
      outputDir = arg;
      outputDirSet = true;
    }
  }

  // Backwards compatibility: bare `--excel-master`/`--excel-only`/`--google-sheets`
  // used to disable JSON+CSV when used alone. Keep JSON+CSV on by default only when
  // no exclusive "-only" flag was passed; `--excel-master` alone previously disabled
  // them, so preserve that behavior when it's the sole format flag.
  if (options.excelMaster && !options.excel && !args.some(a => onlyFlags[a]) &&
      !args.includes('--json') && !args.includes('--csv') &&
      args.filter(a => a.startsWith('--')).every(a =>
        ['--excel-master', '--excel-compendium', '--no-cache'].includes(a))) {
    options.json = false;
    options.csv = false;
  }

  return { options, outputDir };
}

module.exports = { exportBuildCraftingData, parseCliArgs };
