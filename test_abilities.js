const { createBungieClient } = require('./src/bungieClient');
const { getAllBuildCraftingData } = require('./src/buildCrafting');

async function test() {
  const apiKey = process.env.BUNGIE_API_KEY || 'test-key';
  if (apiKey === 'test-key') {
    console.log('No API key provided, showing structure only');
    console.log('Based on code, abilities should include:');
    console.log('- displayProperties (name, description)');
    console.log('- investmentStats (stat values)');
    console.log('- plugCategoryIdentifier');
    console.log('- talentGrid.hudDamageType');
    console.log('\nBut investmentStats might need better transformation for export');
    return;
  }
  
  const client = createBungieClient(apiKey);
  const data = await getAllBuildCraftingData(client);
  
  console.log('\n=== Sample Ability Data ===');
  if (data.abilities && data.abilities.length > 0) {
    const ability = data.abilities[0];
    console.log(JSON.stringify(ability, null, 2).slice(0, 1000));
  }
  
  console.log('\n=== Sample Fragment Data ===');
  if (data.fragments && data.fragments.length > 0) {
    const fragment = data.fragments[0];
    console.log(JSON.stringify(fragment, null, 2).slice(0, 1000));
  }
}

test().catch(console.error);
