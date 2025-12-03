const fs = require('fs');
const path = require('path');
const { createBungieClient } = require('./bungieClient');
const { getAllBuildCraftingData } = require('./buildCrafting');

/**
 * Export build crafting data to JSON files
 * @param {string} outputDir - Directory to save the files
 */
async function exportBuildCraftingData(outputDir = './data') {
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
    
    // Export each category to a separate file
    const exports = [
      { name: 'weapons', data: buildData.weapons },
      { name: 'armor', data: buildData.armor },
      { name: 'armor-mods', data: buildData.armorMods },
      { name: 'subclasses', data: buildData.subclasses },
      { name: 'aspects', data: buildData.aspects },
      { name: 'fragments', data: buildData.fragments }
    ];
    
    for (const { name, data } of exports) {
      const filename = path.join(outputDir, `${name}.json`);
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`Exported ${data.length} ${name} to ${filename}`);
    }
    
    // Create a summary file
    const summary = {
      exportDate: new Date().toISOString(),
      counts: {
        weapons: buildData.weapons.length,
        armor: buildData.armor.length,
        armorMods: buildData.armorMods.length,
        subclasses: buildData.subclasses.length,
        aspects: buildData.aspects.length,
        fragments: buildData.fragments.length
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
  const outputDir = process.argv[2] || './data';
  exportBuildCraftingData(outputDir).catch(error => {
    console.error('Export failed:', error.message);
    process.exit(1);
  });
}

module.exports = { exportBuildCraftingData };
