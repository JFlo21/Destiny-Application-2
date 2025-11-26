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
  ITEM_CATEGORIES
} = require('../src/buildCrafting');

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

// Integration Tests (require network access)
async function runIntegrationTests() {
  console.log('\n=== Integration Tests ===\n');
  
  const apiKey = process.env.BUNGIE_API_KEY || 'a01cfd7260124c5790fee6781f8bebaa';
  
  if (!apiKey) {
    console.log('Skipping integration tests - no API key provided');
    return;
  }
  
  // Check if we can reach the Bungie API
  const fetch = require('node-fetch');
  try {
    await fetch('https://www.bungie.net', { method: 'HEAD', timeout: 5000 });
  } catch (error) {
    console.log('Skipping integration tests - cannot reach Bungie API (network unavailable)');
    return;
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
