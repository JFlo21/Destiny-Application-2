const { createBungieClient } = require('../src/bungieClient');
const { 
  loadManifest,
  loadDefinitions,
  getWeapons,
  getArmor,
  getArmorMods,
  getAspects,
  getFragments,
  clearCache,
  isArmor2_0,
  enrichItemWithStats,
  enrichItemWithPerks,
  enrichItemWithIntrinsicPerk,
  enrichItemWithEnergyType,
  enrichItemWithLore,
  getCurrentSeasonNumber,
  filterUsableItems,
  ITEM_CATEGORIES,
  ARMOR_2_0_PLUG_SET_HASH,
  ARMOR_MOD_IDENTIFIERS
} = require('../src/buildCrafting');
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

/**
 * Simple test runner
 */
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    testsFailed++;
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

async function asyncTest(name, fn) {
  testsRun++;
  try {
    await fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    testsFailed++;
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

// Unit Tests
console.log('\n=== Unit Tests ===\n');

test('createBungieClient throws error without API key', () => {
  try {
    createBungieClient();
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message === 'Bungie API key is required');
  }
});

test('createBungieClient throws error with empty API key', () => {
  try {
    createBungieClient('');
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message === 'Bungie API key is required');
  }
});

test('createBungieClient creates client with valid API key', () => {
  const client = createBungieClient('test-api-key');
  assert(client !== null, 'Client should not be null');
  assert(typeof client.request === 'function', 'Client should have request method');
  assert(typeof client.headers === 'object', 'Client should have headers');
});

test('createBungieClient sets correct headers', () => {
  const apiKey = 'test-api-key';
  const client = createBungieClient(apiKey);
  assertEqual(client.headers['X-API-Key'], apiKey, 'API key header should match');
  assertEqual(client.headers['Content-Type'], 'application/json', 'Content-Type should be JSON');
});

test('ITEM_CATEGORIES has correct values', () => {
  assertEqual(ITEM_CATEGORIES.WEAPON, 1, 'Weapon category should be 1');
  assertEqual(ITEM_CATEGORIES.ARMOR, 20, 'Armor category should be 20');
  assertEqual(ITEM_CATEGORIES.ARMOR_MODS, 59, 'Armor mods category should be 59');
});

test('isArmor2_0 returns true for armor with energy capacity', () => {
  const armor2Item = {
    energy: { energyCapacity: 10 }
  };
  assert(isArmor2_0(armor2Item), 'Should return true for armor with energy capacity');
});

test('isArmor2_0 returns false for armor without energy capacity', () => {
  const legacyArmor = {
    energy: { energyCapacity: 0 }
  };
  assert(!isArmor2_0(legacyArmor), 'Should return false for armor without energy capacity');
});

test('isArmor2_0 returns true for armor with Armor 2.0 plug set hash', () => {
  const armor2Item = {
    sockets: {
      socketEntries: [
        { plugSetHash: ARMOR_2_0_PLUG_SET_HASH }
      ]
    }
  };
  assert(isArmor2_0(armor2Item), 'Should return true for armor with Armor 2.0 plug set hash');
});

test('enrichItemWithPerks resolves damage type using defaultDamageTypeHash', () => {
  const item = {
    defaultDamageType: 3,           // enum value (Solar)
    defaultDamageTypeHash: 1847026933, // actual hash for Solar
    perks: []
  };
  const perkDefs = {};
  const damageTypeDefs = {
    '1847026933': {
      displayProperties: { name: 'Solar', description: 'Solar damage' },
      enumValue: 3
    }
  };
  
  const enriched = enrichItemWithPerks(item, perkDefs, damageTypeDefs);
  assert(enriched.enrichedDamageType !== null, 'Should have enrichedDamageType');
  assertEqual(enriched.enrichedDamageType.name, 'Solar', 'Should resolve damage type name');
  assertEqual(enriched.enrichedDamageType.hash, 1847026933, 'Should use hash, not enum value');
  assertEqual(enriched.enrichedDamageType.enumValue, 3, 'Should include enum value');
});

test('enrichItemWithPerks does not resolve when only defaultDamageType (enum) is present', () => {
  const item = {
    defaultDamageType: 3,           // only enum value, no hash
    perks: []
  };
  const perkDefs = {};
  const damageTypeDefs = {
    '1847026933': {
      displayProperties: { name: 'Solar', description: 'Solar damage' },
      enumValue: 3
    }
  };
  
  const enriched = enrichItemWithPerks(item, perkDefs, damageTypeDefs);
  // Should be null because defaultDamageTypeHash is not set
  assert(enriched.enrichedDamageType === null, 'Should not resolve damage type without hash');
});

test('enrichItemWithStats adds enriched stats to item', () => {
  const item = {
    stats: {
      stats: {
        '2996146975': { value: 10 }
      }
    }
  };
  const statDefs = {
    '2996146975': {
      displayProperties: {
        name: 'Mobility',
        description: 'Increases movement speed'
      }
    }
  };
  
  const enriched = enrichItemWithStats(item, statDefs);
  assert(enriched.enrichedStats, 'Should have enrichedStats');
  assert(enriched.enrichedStats['2996146975'], 'Should have stat hash key');
  assertEqual(enriched.enrichedStats['2996146975'].name, 'Mobility', 'Stat name should be Mobility');
  assertEqual(enriched.enrichedStats['2996146975'].value, 10, 'Stat value should be 10');
});

test('enrichItemWithIntrinsicPerk resolves intrinsic perk from item definitions', () => {
  const item = {
    sockets: {
      socketEntries: [
        { singleInitialItemHash: 12345, socketTypeHash: 111 }
      ]
    }
  };
  const itemDefs = {
    '12345': {
      displayProperties: { name: 'Aggressive Frame', description: 'High damage, slow firing auto rifle.' }
    }
  };
  
  const enriched = enrichItemWithIntrinsicPerk(item, itemDefs);
  assert(enriched.enrichedIntrinsicPerk !== undefined, 'Should have enrichedIntrinsicPerk');
  assertEqual(enriched.enrichedIntrinsicPerk.name, 'Aggressive Frame', 'Should resolve intrinsic perk name');
  assertEqual(enriched.enrichedIntrinsicPerk.hash, 12345, 'Should include intrinsic perk hash');
  assert(enriched.enrichedIntrinsicPerk.description.includes('High damage'), 'Should include description');
});

test('enrichItemWithIntrinsicPerk returns item unchanged when no sockets', () => {
  const item = { hash: 999, displayProperties: { name: 'No Sockets' } };
  const itemDefs = {};
  
  const enriched = enrichItemWithIntrinsicPerk(item, itemDefs);
  assert(enriched.enrichedIntrinsicPerk === undefined, 'Should not have enrichedIntrinsicPerk');
});

test('enrichItemWithIntrinsicPerk returns item unchanged when intrinsic not found in defs', () => {
  const item = {
    sockets: {
      socketEntries: [
        { singleInitialItemHash: 99999, socketTypeHash: 111 }
      ]
    }
  };
  const itemDefs = {};
  
  const enriched = enrichItemWithIntrinsicPerk(item, itemDefs);
  assert(enriched.enrichedIntrinsicPerk === undefined, 'Should not have enrichedIntrinsicPerk when not found');
});

test('filterUsableItems filters out redacted items', () => {
  const items = [
    { displayProperties: { name: 'Valid Item' }, equippable: true, redacted: false },
    { displayProperties: { name: 'Redacted Item' }, equippable: true, redacted: true }
  ];
  const filtered = filterUsableItems(items);
  assertEqual(filtered.length, 1, 'Should filter out redacted items');
  assertEqual(filtered[0].displayProperties.name, 'Valid Item', 'Should keep valid item');
});

test('filterUsableItems filters out non-equippable items', () => {
  const items = [
    { displayProperties: { name: 'Equippable' }, equippable: true },
    { displayProperties: { name: 'Non-Equippable' }, equippable: false }
  ];
  const filtered = filterUsableItems(items);
  assertEqual(filtered.length, 1, 'Should filter out non-equippable items');
  assertEqual(filtered[0].displayProperties.name, 'Equippable', 'Should keep equippable item');
});

test('filterUsableItems filters out items without names', () => {
  const items = [
    { displayProperties: { name: 'Named Item' }, equippable: true },
    { displayProperties: {}, equippable: true },
    { equippable: true }
  ];
  const filtered = filterUsableItems(items);
  assertEqual(filtered.length, 1, 'Should filter out unnamed items');
  assertEqual(filtered[0].displayProperties.name, 'Named Item', 'Should keep named item');
});

test('filterUsableItems keeps items with undefined equippable (defaults to equippable)', () => {
  const items = [
    { displayProperties: { name: 'Item' } }
  ];
  const filtered = filterUsableItems(items);
  assertEqual(filtered.length, 1, 'Should keep items with undefined equippable');
});

test('filterUsableItems with allowNonEquippable=true keeps non-equippable items', () => {
  const items = [
    { displayProperties: { name: 'Equippable' }, equippable: true },
    { displayProperties: { name: 'Non-Equippable' }, equippable: false }
  ];
  const filtered = filterUsableItems(items, true);
  assertEqual(filtered.length, 2, 'Should keep both equippable and non-equippable items');
});

test('filterUsableItems with allowNonEquippable=true still filters out redacted items', () => {
  const items = [
    { displayProperties: { name: 'Valid Non-Equippable' }, equippable: false, redacted: false },
    { displayProperties: { name: 'Redacted Non-Equippable' }, equippable: false, redacted: true }
  ];
  const filtered = filterUsableItems(items, true);
  assertEqual(filtered.length, 1, 'Should filter out redacted items even with allowNonEquippable=true');
  assertEqual(filtered[0].displayProperties.name, 'Valid Non-Equippable', 'Should keep valid non-equippable item');
});

test('filterUsableItems with allowNonEquippable=false filters out non-equippable items', () => {
  const items = [
    { displayProperties: { name: 'Equippable' }, equippable: true },
    { displayProperties: { name: 'Non-Equippable' }, equippable: false }
  ];
  const filtered = filterUsableItems(items, false);
  assertEqual(filtered.length, 1, 'Should filter out non-equippable items when allowNonEquippable=false');
  assertEqual(filtered[0].displayProperties.name, 'Equippable', 'Should keep equippable item');
});

test('enrichItemWithEnergyType resolves energy type from DestinyEnergyTypeDefinition', () => {
  const item = {
    energy: {
      energyCapacity: 10,
      energyType: 1,
      energyTypeHash: 591714140
    }
  };
  const energyTypeDefs = {
    '591714140': {
      displayProperties: { name: 'Arc', description: 'Arc energy type' },
      enumValue: 1,
      capacityStatHash: 123,
      costStatHash: 456
    }
  };
  
  const enriched = enrichItemWithEnergyType(item, energyTypeDefs);
  assert(enriched.enrichedEnergyType !== undefined, 'Should have enrichedEnergyType');
  assertEqual(enriched.enrichedEnergyType.name, 'Arc', 'Should resolve energy type name');
  assertEqual(enriched.enrichedEnergyType.hash, 591714140, 'Should include energy type hash');
  assertEqual(enriched.enrichedEnergyType.enumValue, 1, 'Should include enum value');
});

test('enrichItemWithEnergyType returns item unchanged when no energy', () => {
  const item = { hash: 999, displayProperties: { name: 'No Energy' } };
  const energyTypeDefs = {};
  
  const enriched = enrichItemWithEnergyType(item, energyTypeDefs);
  assert(enriched.enrichedEnergyType === undefined, 'Should not have enrichedEnergyType');
});

test('enrichItemWithEnergyType returns item unchanged when energy type hash not found', () => {
  const item = {
    energy: {
      energyCapacity: 10,
      energyType: 1,
      energyTypeHash: 999999
    }
  };
  const energyTypeDefs = {};
  
  const enriched = enrichItemWithEnergyType(item, energyTypeDefs);
  assert(enriched.enrichedEnergyType === undefined, 'Should not have enrichedEnergyType when not found');
});

test('enrichItemWithEnergyType resolves energy type for armor mods via plug.energyCost.energyTypeHash', () => {
  const item = {
    plug: {
      energyCost: {
        energyType: 1,
        energyTypeHash: 591714140,
        energyCost: 3
      }
    }
  };
  const energyTypeDefs = {
    '591714140': {
      displayProperties: { name: 'Arc', description: 'Arc energy type' },
      enumValue: 1,
      capacityStatHash: 123,
      costStatHash: 456
    }
  };

  const enriched = enrichItemWithEnergyType(item, energyTypeDefs);
  assert(enriched.enrichedEnergyType !== undefined, 'Should have enrichedEnergyType for mods');
  assertEqual(enriched.enrichedEnergyType.name, 'Arc', 'Should resolve energy type name for mods');
  assertEqual(enriched.enrichedEnergyType.hash, 591714140, 'Should include energy type hash for mods');
  assertEqual(enriched.enrichedEnergyType.enumValue, 1, 'Should include enum value for mods');
  assertEqual(enriched.enrichedEnergyType.source, 'modEnergyCost', 'Should indicate mod energy cost source');
});

test('enrichItemWithEnergyType prefers armor energy path over mod path', () => {
  const item = {
    energy: {
      energyCapacity: 10,
      energyType: 1,
      energyTypeHash: 591714140
    },
    plug: {
      energyCost: {
        energyType: 3,
        energyTypeHash: 999888,
        energyCost: 5
      }
    }
  };
  const energyTypeDefs = {
    '591714140': {
      displayProperties: { name: 'Arc', description: 'Arc energy type' },
      enumValue: 1
    },
    '999888': {
      displayProperties: { name: 'Void', description: 'Void energy type' },
      enumValue: 3
    }
  };

  const enriched = enrichItemWithEnergyType(item, energyTypeDefs);
  assertEqual(enriched.enrichedEnergyType.name, 'Arc', 'Should prefer armor energy path');
  assertEqual(enriched.enrichedEnergyType.source, 'armorEnergy', 'Should indicate armor energy source');
});

test('enrichItemWithLore resolves lore text from DestinyLoreDefinition', () => {
  const item = {
    hash: 123,
    displayProperties: { name: 'Test Item' },
    loreHash: 456789
  };
  const loreDefs = {
    '456789': {
      displayProperties: {
        name: 'The Story',
        description: 'A long time ago in a galaxy far away...'
      },
      subtitle: 'Chapter 1'
    }
  };

  const enriched = enrichItemWithLore(item, loreDefs);
  assert(enriched.enrichedLore !== undefined, 'Should have enrichedLore');
  assertEqual(enriched.enrichedLore.name, 'The Story', 'Should resolve lore name');
  assertEqual(enriched.enrichedLore.description, 'A long time ago in a galaxy far away...', 'Should resolve lore description');
  assertEqual(enriched.enrichedLore.subtitle, 'Chapter 1', 'Should resolve lore subtitle');
});

test('enrichItemWithLore returns item unchanged when no loreHash', () => {
  const item = { hash: 999, displayProperties: { name: 'No Lore' } };
  const loreDefs = {};
  
  const enriched = enrichItemWithLore(item, loreDefs);
  assert(enriched.enrichedLore === undefined, 'Should not have enrichedLore');
});

test('ARMOR_MOD_IDENTIFIERS contains expected patterns', () => {
  assert(ARMOR_MOD_IDENTIFIERS.includes('v2'), 'Should include v2');
  assert(ARMOR_MOD_IDENTIFIERS.includes('enhancements'), 'Should include enhancements');
  assert(ARMOR_MOD_IDENTIFIERS.includes('armor_tier'), 'Should include armor_tier');
});

// Integration Tests (require network access)
async function runIntegrationTests() {
  console.log('\n=== Integration Tests ===\n');
  
  const apiKey = process.env.BUNGIE_API_KEY;
  
  if (!apiKey) {
    console.log('Skipping integration tests - BUNGIE_API_KEY environment variable not set');
    return;
  }
  
  // Check if we can reach the Bungie API with AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    await fetch('https://www.bungie.net', { method: 'HEAD', signal: controller.signal });
  } catch (error) {
    console.log('Skipping integration tests - cannot reach Bungie API (network unavailable)');
    return;
  } finally {
    clearTimeout(timeoutId);
  }
  
  const client = createBungieClient(apiKey);
  clearCache(); // Clear any cached data
  
  await asyncTest('loadManifest fetches manifest successfully', async () => {
    const manifest = await loadManifest(client);
    assert(manifest !== null, 'Manifest should not be null');
    assert(manifest.jsonWorldComponentContentPaths, 'Manifest should have jsonWorldComponentContentPaths');
  });
  
  await asyncTest('loadDefinitions fetches DestinyInventoryItemDefinition', async () => {
    const definitions = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
    assert(definitions !== null, 'Definitions should not be null');
    assert(Object.keys(definitions).length > 0, 'Definitions should have items');
  });
  
  await asyncTest('getWeapons returns weapon items', async () => {
    const weapons = await getWeapons(client);
    assert(Array.isArray(weapons), 'Weapons should be an array');
    assert(weapons.length > 0, 'Should have at least one weapon');
  });
  
  await asyncTest('getArmor returns armor items', async () => {
    const armor = await getArmor(client);
    assert(Array.isArray(armor), 'Armor should be an array');
    assert(armor.length > 0, 'Should have at least one armor piece');
  });
  
  await asyncTest('getArmorMods returns armor mod items', async () => {
    const mods = await getArmorMods(client);
    assert(Array.isArray(mods), 'Mods should be an array');
    assert(mods.length > 0, 'Should have at least one mod');
  });
  
  await asyncTest('getAspects returns aspect items', async () => {
    const aspects = await getAspects(client);
    assert(Array.isArray(aspects), 'Aspects should be an array');
    // Aspects may be empty if none match the criteria
  });
  
  await asyncTest('getFragments returns fragment items', async () => {
    const fragments = await getFragments(client);
    assert(Array.isArray(fragments), 'Fragments should be an array');
    // Fragments may be empty if none match the criteria
  });
  
  await asyncTest('getCurrentSeasonNumber dynamically detects current season', async () => {
    const seasonNumber = await getCurrentSeasonNumber(client);
    assert(typeof seasonNumber === 'number', 'Season number should be a number');
    assert(seasonNumber > 0, 'Season number should be greater than 0');
    // Current season should be a reasonable number (Destiny 2 started at Season 1)
    assert(seasonNumber >= 1 && seasonNumber <= 100, 'Season number should be between 1 and 100');
  });
}

async function runAllTests() {
  try {
    await runIntegrationTests();
  } catch (error) {
    console.error('Integration test error:', error.message);
  }
  
  console.log('\n=== Test Summary ===\n');
  console.log(`Total: ${testsRun}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runAllTests();
