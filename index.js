const { createBungieClient } = require('./src/bungieClient');
const { getAllBuildCraftingData, getWeapons, getArmor, getArmorMods, getAspects, getFragments } = require('./src/buildCrafting');

/**
 * Main function to demonstrate fetching build crafting data from Bungie API
 */
async function main() {
  // Get API key from environment variable
  const apiKey = process.env.BUNGIE_API_KEY;
  
  if (!apiKey) {
    console.error('Error: BUNGIE_API_KEY environment variable is not set');
    console.log('Usage: BUNGIE_API_KEY=your_api_key npm start');
    process.exit(1);
  }
  
  console.log('Destiny 2 Build Crafting Data Fetcher');
  console.log('=====================================\n');
  
  try {
    // Create Bungie API client
    const client = createBungieClient(apiKey);
    
    // Fetch all build crafting data
    const buildData = await getAllBuildCraftingData(client);
    
    // Display summary
    console.log('\n=== Summary ===\n');
    console.log(`Total Weapons: ${buildData.weapons.length}`);
    console.log(`Total Armor: ${buildData.armor.length}`);
    console.log(`Total Armor Mods: ${buildData.armorMods.length}`);
    console.log(`Total Subclasses: ${buildData.subclasses.length}`);
    console.log(`Total Aspects: ${buildData.aspects.length}`);
    console.log(`Total Fragments: ${buildData.fragments.length}`);
    console.log(`Total Abilities: ${buildData.abilities.length}`);
    
    // Sample output - show first few items from each category
    console.log('\n=== Sample Data ===\n');
    
    if (buildData.weapons.length > 0) {
      console.log('Sample Weapons:');
      buildData.weapons.slice(0, 5).forEach(weapon => {
        console.log(`  - ${weapon.displayProperties?.name || 'Unknown'} (${weapon.itemTypeDisplayName || 'Unknown type'})`);
      });
    }
    
    if (buildData.armor.length > 0) {
      console.log('\nSample Armor:');
      buildData.armor.slice(0, 5).forEach(armor => {
        console.log(`  - ${armor.displayProperties?.name || 'Unknown'} (${armor.itemTypeDisplayName || 'Unknown type'})`);
      });
    }
    
    if (buildData.armorMods.length > 0) {
      console.log('\nSample Armor Mods:');
      buildData.armorMods.slice(0, 5).forEach(mod => {
        console.log(`  - ${mod.displayProperties?.name || 'Unknown'}`);
      });
    }
    
    if (buildData.aspects.length > 0) {
      console.log('\nSample Aspects:');
      buildData.aspects.slice(0, 5).forEach(aspect => {
        console.log(`  - ${aspect.displayProperties?.name || 'Unknown'}`);
      });
    }
    
    if (buildData.fragments.length > 0) {
      console.log('\nSample Fragments:');
      buildData.fragments.slice(0, 5).forEach(fragment => {
        console.log(`  - ${fragment.displayProperties?.name || 'Unknown'}`);
      });
    }
    
    console.log('\n=== Data Fetch Complete ===');
    
    return buildData;
    
  } catch (error) {
    console.error('Error fetching data:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
