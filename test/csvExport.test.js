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

console.log('\n=== Test Summary ===\n');
console.log(`Total: ${testsRun}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

process.exit(testsFailed > 0 ? 1 : 0);
