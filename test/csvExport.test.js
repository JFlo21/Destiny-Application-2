const fs = require('fs');
const path = require('path');
const { transformItemForCSV, transformItemsForCSV, STAT_HASHES, resolveStatName, AMMO_TYPES, WEAPON_SLOT_BUCKETS, BREAKER_TYPES, DAMAGE_TYPE_NAMES } = require('../src/csvExport');

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

test('resolveStatName uses stat definitions when provided', () => {
  const mockStatDefs = {
    '123456': {
      displayProperties: {
        name: 'Custom Stat Name'
      }
    }
  };
  
  const result = resolveStatName('123456', mockStatDefs);
  assertEqual(result, 'Custom Stat Name', 'Should resolve from stat definitions');
});

test('resolveStatName falls back to STAT_HASHES', () => {
  const result = resolveStatName('2996146975', null);
  assertEqual(result, 'Mobility', 'Should fall back to hardcoded STAT_HASHES');
});

test('resolveStatName handles unknown stats', () => {
  const result = resolveStatName('999999999', null);
  assertEqual(result, 'Stat_999999999', 'Should return prefixed hash for unknown stats');
});

test('transformItemForCSV with statDefs resolves all stat hashes', () => {
  const mockStatDefs = {
    '123456': {
      displayProperties: { name: 'Test Stat' }
    },
    '789012': {
      displayProperties: { name: 'Another Stat' }
    }
  };
  
  const item = {
    hash: 111,
    displayProperties: { name: 'Test Item' },
    investmentStats: [
      { statTypeHash: 123456, value: 50 },
      { statTypeHash: 789012, value: 75 }
    ]
  };
  
  const transformed = transformItemForCSV(item, 'weapons', mockStatDefs);
  assertEqual(transformed['Test Stat'], 50, 'Should resolve first custom stat');
  assertEqual(transformed['Another Stat'], 75, 'Should resolve second custom stat');
});

test('transformItemForCSV extracts subclass properties', () => {
  const item = {
    hash: 999,
    displayProperties: { name: 'Void 3.0', description: 'Void subclass for Warlock' },
    classType: 2,
    defaultDamageType: 3,
    itemCategoryHashes: [1403, 3379164649]
  };
  
  const transformed = transformItemForCSV(item, 'subclasses');
  assertEqual(transformed.name, 'Void 3.0');
  assertEqual(transformed.classType, 'Warlock');
  assertEqual(transformed.damageType, 3);
  assert(transformed.itemCategoryHashes.includes('1403'), 'Should include category hashes');
});

test('transformItemForCSV returns enemyWeaknesses data as-is', () => {
  const item = {
    faction: 'FALLEN',
    enemyType: 'Captain',
    shieldType: 'Arc',
    effectiveDamageType: 'Arc',
    damageTypeEnum: 2,
    notes: 'Arc damage is most common'
  };
  
  const transformed = transformItemForCSV(item, 'enemyWeaknesses');
  assertEqual(transformed.faction, 'FALLEN');
  assertEqual(transformed.enemyType, 'Captain');
  assertEqual(transformed.shieldType, 'Arc');
  assertEqual(transformed.effectiveDamageType, 'Arc');
  assertEqual(transformed.damageTypeEnum, 2);
  assertEqual(transformed.notes, 'Arc damage is most common');
  // Should NOT have generic item fields
  assert(transformed.hash === undefined, 'Should not have hash field from generic transform');
  assert(transformed.name === undefined, 'Should not have name field from generic transform');
});

test('transformItemForCSV includes screenshot URL when available', () => {
  const item = {
    hash: 123,
    displayProperties: { name: 'Test Weapon', icon: '/icons/test.jpg' },
    screenshot: '/screenshots/test_screenshot.jpg'
  };
  
  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.screenshotUrl, 'https://www.bungie.net/screenshots/test_screenshot.jpg');
  assertEqual(transformed.iconUrl, 'https://www.bungie.net/icons/test.jpg');
});

test('transformItemForCSV includes iconWatermark URLs when available', () => {
  const item = {
    hash: 456,
    displayProperties: { name: 'Test Item' },
    iconWatermark: '/watermarks/exotic.png',
    iconWatermarkShelved: '/watermarks/exotic_shelved.png'
  };
  
  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.iconWatermarkUrl, 'https://www.bungie.net/watermarks/exotic.png');
  assertEqual(transformed.iconWatermarkShelvedUrl, 'https://www.bungie.net/watermarks/exotic_shelved.png');
});

test('transformItemForCSV omits asset URLs when not present', () => {
  const item = {
    hash: 789,
    displayProperties: { name: 'Basic Item' }
  };
  
  const transformed = transformItemForCSV(item, 'weapons');
  assert(transformed.screenshotUrl === undefined, 'Should not have screenshotUrl when not present');
  assert(transformed.iconWatermarkUrl === undefined, 'Should not have iconWatermarkUrl when not present');
  assert(transformed.iconWatermarkShelvedUrl === undefined, 'Should not have iconWatermarkShelvedUrl when not present');
  assert(transformed.iconUrl === undefined, 'Should not have iconUrl when not present');
});

// New field tests

test('AMMO_TYPES maps enum values correctly', () => {
  assertEqual(AMMO_TYPES[1], 'Primary', 'Ammo type 1 should be Primary');
  assertEqual(AMMO_TYPES[2], 'Special', 'Ammo type 2 should be Special');
  assertEqual(AMMO_TYPES[3], 'Heavy', 'Ammo type 3 should be Heavy');
});

test('WEAPON_SLOT_BUCKETS maps bucket hashes correctly', () => {
  assertEqual(WEAPON_SLOT_BUCKETS['1498876634'], 'Kinetic', 'Should map kinetic slot');
  assertEqual(WEAPON_SLOT_BUCKETS['2465295065'], 'Energy', 'Should map energy slot');
  assertEqual(WEAPON_SLOT_BUCKETS['953998645'], 'Power', 'Should map power slot');
});

test('BREAKER_TYPES maps enum values correctly', () => {
  assertEqual(BREAKER_TYPES[1], 'Shield-Piercing (Anti-Barrier)', 'Breaker type 1 should be Anti-Barrier');
  assertEqual(BREAKER_TYPES[2], 'Disruption (Overload)', 'Breaker type 2 should be Overload');
  assertEqual(BREAKER_TYPES[3], 'Stagger (Unstoppable)', 'Breaker type 3 should be Unstoppable');
});

test('DAMAGE_TYPE_NAMES maps enum values correctly', () => {
  assertEqual(DAMAGE_TYPE_NAMES[1], 'Kinetic', 'Damage type 1 should be Kinetic');
  assertEqual(DAMAGE_TYPE_NAMES[2], 'Arc', 'Damage type 2 should be Arc');
  assertEqual(DAMAGE_TYPE_NAMES[3], 'Solar', 'Damage type 3 should be Solar');
  assertEqual(DAMAGE_TYPE_NAMES[4], 'Void', 'Damage type 4 should be Void');
  assertEqual(DAMAGE_TYPE_NAMES[6], 'Stasis', 'Damage type 6 should be Stasis');
  assertEqual(DAMAGE_TYPE_NAMES[7], 'Strand', 'Damage type 7 should be Strand');
});

test('transformItemForCSV includes flavorText and collectibleHash', () => {
  const item = {
    hash: 100,
    displayProperties: { name: 'Exotic Gun' },
    flavorText: 'A legendary weapon of old.',
    collectibleHash: 9876543
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.flavorText, 'A legendary weapon of old.');
  assertEqual(transformed.collectibleHash, 9876543);
});

test('transformItemForCSV includes itemTypeAndTierDisplayName', () => {
  const item = {
    hash: 101,
    displayProperties: { name: 'Exotic Pulse Rifle' },
    itemTypeAndTierDisplayName: 'Exotic Pulse Rifle'
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.itemTypeAndTierDisplayName, 'Exotic Pulse Rifle');
});

test('transformItemForCSV resolves weapon ammo type to name', () => {
  const item = {
    hash: 200,
    displayProperties: { name: 'Heavy Weapon' },
    equippingBlock: { ammoType: 3 }
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.ammoType, 'Heavy', 'ammoType should be resolved to Heavy');
});

test('transformItemForCSV resolves weapon slot from bucket hash', () => {
  const item = {
    hash: 201,
    displayProperties: { name: 'Energy Weapon' },
    inventory: { bucketTypeHash: 2465295065, tierTypeName: 'Legendary' }
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.weaponSlot, 'Energy', 'weaponSlot should be Energy');
});

test('transformItemForCSV resolves weapon default damage type to name', () => {
  const item = {
    hash: 202,
    displayProperties: { name: 'Arc Weapon' },
    defaultDamageType: 2,
    equippingBlock: {}
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.defaultDamageType, 'Arc', 'defaultDamageType should be Arc');
});

test('transformItemForCSV includes breaker type for exotic weapons', () => {
  const item = {
    hash: 203,
    displayProperties: { name: 'Anti-Barrier Exotic' },
    breakerType: 1
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.breakerType, 'Shield-Piercing (Anti-Barrier)', 'breakerType should resolve');
});

test('transformItemForCSV includes enrichedIntrinsicPerk for weapons', () => {
  const item = {
    hash: 204,
    displayProperties: { name: 'Test Weapon' },
    enrichedIntrinsicPerk: {
      hash: 999,
      name: 'Aggressive Frame',
      description: 'High damage, slow firing.'
    }
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.intrinsicPerkName, 'Aggressive Frame');
  assertEqual(transformed.intrinsicPerkDescription, 'High damage, slow firing.');
  assertEqual(transformed.intrinsicPerkHash, 999);
});

test('transformItemForCSV resolves subclass damageTypeName', () => {
  const item = {
    hash: 300,
    displayProperties: { name: 'Gunslinger', description: 'Solar subclass' },
    classType: 1,
    defaultDamageType: 3,
    itemCategoryHashes: [1403]
  };

  const transformed = transformItemForCSV(item, 'subclasses');
  assertEqual(transformed.damageTypeName, 'Solar', 'Subclass damageTypeName should be Solar');
});

test('transformItemForCSV resolves aspect element from plugCategoryIdentifier', () => {
  const item = {
    hash: 400,
    displayProperties: { name: 'Solar Aspect' },
    plug: { plugCategoryIdentifier: 'v400.plugs.aspects.solar' },
    talentGrid: { hudDamageType: 3 }
  };

  const transformed = transformItemForCSV(item, 'aspects');
  assertEqual(transformed.element, 'Solar', 'Aspect element should be Solar');
  assertEqual(transformed.damageTypeName, 'Solar', 'Aspect damageTypeName should be Solar');
});

test('transformItemForCSV resolves fragment element from plugCategoryIdentifier', () => {
  const item = {
    hash: 401,
    displayProperties: { name: 'Void Fragment' },
    plug: { plugCategoryIdentifier: 'v400.plugs.fragments.void' }
  };

  const transformed = transformItemForCSV(item, 'fragments');
  assertEqual(transformed.element, 'Void', 'Fragment element should be Void');
});

test('transformItemForCSV resolves ability element from plugCategoryIdentifier', () => {
  const item = {
    hash: 500,
    displayProperties: { name: 'Arc Grenade' },
    plug: { plugCategoryIdentifier: 'v400.plugs.grenades.arc' },
    talentGrid: { hudDamageType: 2 }
  };

  const transformed = transformItemForCSV(item, 'abilities');
  assertEqual(transformed.element, 'Arc', 'Ability element should be Arc');
  assertEqual(transformed.damageTypeName, 'Arc');
});

test('transformItemForCSV handles weapon with no breaker type', () => {
  const item = {
    hash: 205,
    displayProperties: { name: 'Normal Weapon' }
  };

  const transformed = transformItemForCSV(item, 'weapons');
  assertEqual(transformed.breakerType, '', 'breakerType should be empty string');
});

console.log('\n=== Test Summary ===\n');
console.log(`Total: ${testsRun}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

process.exit(testsFailed > 0 ? 1 : 0);
