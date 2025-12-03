const fs = require('fs');
const path = require('path');
const { transformItemForCSV, transformItemsForCSV, STAT_HASHES } = require('../src/csvExport');

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

console.log('\n=== CSV Export Tests ===\n');

// Test stat hash mapping
test('STAT_HASHES contains common armor stats', () => {
  assert(STAT_HASHES['2996146975'] === 'Mobility', 'Should have Mobility stat');
  assert(STAT_HASHES['392767087'] === 'Resilience', 'Should have Resilience stat');
  assert(STAT_HASHES['1943323491'] === 'Recovery', 'Should have Recovery stat');
});

test('STAT_HASHES contains common weapon stats', () => {
  assert(STAT_HASHES['4284893193'] === 'RPM (Rounds Per Minute)', 'Should have RPM stat');
  assert(STAT_HASHES['4043523819'] === 'Impact', 'Should have Impact stat');
  assert(STAT_HASHES['1240592695'] === 'Range', 'Should have Range stat');
});

// Test transformItemForCSV
test('transformItemForCSV handles basic item properties', () => {
  const item = {
    hash: 123456,
    displayProperties: {
      name: 'Test Weapon',
      description: 'A test weapon',
      icon: '/common/destiny2_content/icons/test.jpg'
    },
    itemTypeDisplayName: 'Auto Rifle',
    itemSubType: 6,
    inventory: {
      tierTypeName: 'Legendary',
      tierTypeHash: 4008398120
    }
  };
  
  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.hash, 123456);
  assertEqual(transformed.name, 'Test Weapon');
  assertEqual(transformed.description, 'A test weapon');
  assertEqual(transformed.itemType, 'Auto Rifle');
  assertEqual(transformed.tierType, 'Legendary');
  assert(transformed.iconUrl.includes('test.jpg'), 'Icon URL should be set');
});

test('transformItemForCSV handles missing properties gracefully', () => {
  const item = {
    hash: 789,
    displayProperties: {}
  };
  
  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.hash, 789);
  assertEqual(transformed.name, '');
  assertEqual(transformed.description, '');
  assertEqual(transformed.itemType, '');
});

test('transformItemForCSV extracts weapon stats', () => {
  const item = {
    hash: 111,
    displayProperties: { name: 'Weapon' },
    stats: {
      stats: {
        '4043523819': { value: 70 }, // Impact
        '1240592695': { value: 50 }  // Range
      }
    }
  };
  
  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.Impact, 70);
  assertEqual(transformed.Range, 50);
});

test('transformItemForCSV extracts armor class type', () => {
  const item = {
    hash: 222,
    displayProperties: { name: 'Helmet' },
    classType: 0 // Titan
  };
  
  const transformed = transformItemForCSV(item, 'armor');
  assertEqual(transformed.classType, 'Titan');
});

test('transformItemForCSV handles Hunter class type', () => {
  const item = {
    hash: 333,
    displayProperties: { name: 'Cloak' },
    classType: 1 // Hunter
  };
  
  const transformed = transformItemForCSV(item, 'armor');
  assertEqual(transformed.classType, 'Hunter');
});

test('transformItemForCSV handles Warlock class type', () => {
  const item = {
    hash: 444,
    displayProperties: { name: 'Bond' },
    classType: 2 // Warlock
  };
  
  const transformed = transformItemForCSV(item, 'armor');
  assertEqual(transformed.classType, 'Warlock');
});

test('transformItemForCSV extracts armor mod properties', () => {
  const item = {
    hash: 555,
    displayProperties: { name: 'Test Mod' },
    plug: {
      plugCategoryIdentifier: 'enhancements.v2_arms',
      energyCost: {
        energyCost: 3,
        energyTypeHash: 2399985800
      }
    }
  };
  
  const transformed = transformItemForCSV(item, 'armorMods');
  assertEqual(transformed.plugCategoryIdentifier, 'enhancements.v2_arms');
  assertEqual(transformed.energyCost, 3);
});

test('transformItemsForCSV transforms array of items', () => {
  const items = [
    { hash: 1, displayProperties: { name: 'Item 1' } },
    { hash: 2, displayProperties: { name: 'Item 2' } }
  ];
  
  const transformed = transformItemsForCSV(items, 'weapons');
  assertEqual(transformed.length, 2);
  assertEqual(transformed[0].name, 'Item 1');
  assertEqual(transformed[1].name, 'Item 2');
});

test('transformItemForCSV handles investment stats', () => {
  const item = {
    hash: 666,
    displayProperties: { name: 'Test Gun' },
    investmentStats: [
      { statTypeHash: '4043523819', value: 80 }, // Impact
      { statTypeHash: '1240592695', value: 60 }  // Range
    ]
  };
  
  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.Impact, 80);
  assertEqual(transformed.Range, 60);
});

test('transformItemForCSV uses enriched stats when available', () => {
  const item = {
    hash: 777,
    displayProperties: { name: 'Test Armor' },
    enrichedStats: {
      '2996146975': {
        name: 'Mobility',
        value: 15,
        maximum: 100
      },
      '392767087': {
        name: 'Resilience',
        value: 20,
        maximum: 100
      }
    }
  };
  
  const transformed = transformItemForCSV(item, 'armor');
  assertEqual(transformed.Mobility, 15);
  assertEqual(transformed.Resilience, 20);
});

test('transformItemForCSV includes Armor 2.0 energy fields', () => {
  const item = {
    hash: 888,
    displayProperties: { name: 'Armor 2.0 Helmet' },
    classType: 0,
    energy: {
      energyCapacity: 10,
      energyType: 1,
      energyTypeHash: 591714140
    }
  };
  
  const transformed = transformItemForCSV(item, 'armor');
  assertEqual(transformed.energyCapacity, 10);
  assertEqual(transformed.energyType, 1);
  assertEqual(transformed.energyTypeHash, 591714140);
});

test('transformItemForCSV includes stat bonuses for mods', () => {
  const item = {
    hash: 999,
    displayProperties: { name: 'Mobility Mod' },
    plug: {
      plugCategoryIdentifier: 'enhancements.v2_general',
      energyCost: { energyCost: 3 }
    },
    investmentStats: [
      { statTypeHash: 2996146975, value: 10 } // Mobility +10 (using number, not string)
    ]
  };
  
  const transformed = transformItemForCSV(item, 'armorMods');
  assert(transformed.statBonuses.includes('Mobility'), 'Should include Mobility in stat bonuses');
  assert(transformed.statBonuses.includes('+10'), 'Should include +10 in stat bonuses');
});

console.log('\n=== Test Summary ===\n');
console.log(`Total: ${testsRun}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

process.exit(testsFailed > 0 ? 1 : 0);
