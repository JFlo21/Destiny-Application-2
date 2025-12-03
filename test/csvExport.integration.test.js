const fs = require('fs');
const path = require('path');
const os = require('os');
const { exportToCSV, transformItemsForCSV } = require('../src/csvExport');

/**
 * Integration test to verify CSV export with realistic mock data
 */
console.log('\n=== CSV Export Integration Test ===\n');

// Create a temporary test directory (cross-platform)
const testDir = path.join(os.tmpdir(), 'csv-export-test');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Mock weapon data that resembles actual Bungie API structure
const mockWeapons = [
  {
    hash: 1234567890,
    displayProperties: {
      name: 'Ace of Spades',
      description: 'Cayde\'s hand cannon',
      icon: '/common/destiny2_content/icons/ace_of_spades.jpg'
    },
    itemTypeDisplayName: 'Hand Cannon',
    itemSubType: 9,
    inventory: {
      tierTypeName: 'Exotic',
      tierTypeHash: 6
    },
    stats: {
      stats: {
        '4284893193': { value: 140 }, // RPM
        '4043523819': { value: 84 },  // Impact
        '1240592695': { value: 78 },  // Range
        '155624089': { value: 51 },   // Stability
        '943549884': { value: 90 },   // Handling
        '4188031367': { value: 40 }   // Reload Speed
      }
    },
    equippingBlock: {
      ammoType: 1 // Primary
    },
    defaultDamageType: 1
  },
  {
    hash: 9876543210,
    displayProperties: {
      name: 'Fatebringer',
      description: 'A powerful hand cannon',
      icon: '/common/destiny2_content/icons/fatebringer.jpg'
    },
    itemTypeDisplayName: 'Hand Cannon',
    itemSubType: 9,
    inventory: {
      tierTypeName: 'Legendary',
      tierTypeHash: 5
    },
    stats: {
      stats: {
        '4284893193': { value: 140 }, // RPM
        '4043523819': { value: 84 },  // Impact
        '1240592695': { value: 72 },  // Range
        '155624089': { value: 55 },   // Stability
        '943549884': { value: 85 },   // Handling
        '4188031367': { value: 45 }   // Reload Speed
      }
    }
  }
];

// Mock armor data
const mockArmor = [
  {
    hash: 1111111111,
    displayProperties: {
      name: 'Helm of Saint-14',
      description: 'An exotic Titan helmet',
      icon: '/common/destiny2_content/icons/helm_saint14.jpg'
    },
    itemTypeDisplayName: 'Helmet',
    itemSubType: 26,
    inventory: {
      tierTypeName: 'Exotic',
      tierTypeHash: 6
    },
    classType: 0, // Titan
    stats: {
      stats: {
        '2996146975': { value: 2 },  // Mobility
        '392767087': { value: 18 },  // Resilience
        '1943323491': { value: 10 }, // Recovery
        '1735777505': { value: 12 }, // Discipline
        '144602215': { value: 6 },   // Intellect
        '4244567218': { value: 2 }   // Strength
      }
    }
  },
  {
    hash: 2222222222,
    displayProperties: {
      name: 'Celestial Nighthawk',
      description: 'An exotic Hunter helmet',
      icon: '/common/destiny2_content/icons/celestial_nighthawk.jpg'
    },
    itemTypeDisplayName: 'Helmet',
    itemSubType: 26,
    inventory: {
      tierTypeName: 'Exotic',
      tierTypeHash: 6
    },
    classType: 1, // Hunter
    stats: {
      stats: {
        '2996146975': { value: 12 }, // Mobility
        '392767087': { value: 6 },   // Resilience
        '1943323491': { value: 10 }, // Recovery
        '1735777505': { value: 8 },  // Discipline
        '144602215': { value: 16 },  // Intellect
        '4244567218': { value: 2 }   // Strength
      }
    }
  }
];

// Mock armor mods
const mockArmorMods = [
  {
    hash: 3333333333,
    displayProperties: {
      name: 'Resilience Mod',
      description: 'Increases Resilience',
      icon: '/common/destiny2_content/icons/resilience_mod.jpg'
    },
    itemTypeDisplayName: 'Armor Mod',
    plug: {
      plugCategoryIdentifier: 'enhancements.v2_general',
      energyCost: {
        energyCost: 3,
        energyTypeHash: 1
      }
    }
  }
];

try {
  // Test weapon export
  console.log('Testing weapon CSV export...');
  const weaponFile = path.join(testDir, 'test-weapons.csv');
  exportToCSV(mockWeapons, weaponFile, 'weapons');
  
  // Verify file was created
  if (!fs.existsSync(weaponFile)) {
    throw new Error('Weapon CSV file was not created');
  }
  
  // Read and verify CSV content
  const weaponContent = fs.readFileSync(weaponFile, 'utf-8');
  console.log('Weapon CSV created successfully');
  console.log('Sample content:');
  console.log(weaponContent.split('\n').slice(0, 3).join('\n'));
  console.log('...\n');
  
  // Verify headers include readable stat names
  if (!weaponContent.includes('RPM (Rounds Per Minute)')) {
    throw new Error('CSV should contain readable stat name "RPM (Rounds Per Minute)"');
  }
  if (!weaponContent.includes('Impact')) {
    throw new Error('CSV should contain readable stat name "Impact"');
  }
  if (!weaponContent.includes('Range')) {
    throw new Error('CSV should contain readable stat name "Range"');
  }
  
  // Verify weapon names are present
  if (!weaponContent.includes('Ace of Spades')) {
    throw new Error('CSV should contain weapon name "Ace of Spades"');
  }
  
  console.log('✓ Weapon export verification passed');
  
  // Test armor export
  console.log('\nTesting armor CSV export...');
  const armorFile = path.join(testDir, 'test-armor.csv');
  exportToCSV(mockArmor, armorFile, 'armor');
  
  if (!fs.existsSync(armorFile)) {
    throw new Error('Armor CSV file was not created');
  }
  
  const armorContent = fs.readFileSync(armorFile, 'utf-8');
  console.log('Armor CSV created successfully');
  console.log('Sample content:');
  console.log(armorContent.split('\n').slice(0, 3).join('\n'));
  console.log('...\n');
  
  // Verify armor stats
  if (!armorContent.includes('Mobility')) {
    throw new Error('CSV should contain readable stat name "Mobility"');
  }
  if (!armorContent.includes('Resilience')) {
    throw new Error('CSV should contain readable stat name "Resilience"');
  }
  
  // Verify class types are human-readable
  if (!armorContent.includes('Titan')) {
    throw new Error('CSV should contain class type "Titan"');
  }
  if (!armorContent.includes('Hunter')) {
    throw new Error('CSV should contain class type "Hunter"');
  }
  
  console.log('✓ Armor export verification passed');
  
  // Test armor mod export
  console.log('\nTesting armor mod CSV export...');
  const modFile = path.join(testDir, 'test-mods.csv');
  exportToCSV(mockArmorMods, modFile, 'armorMods');
  
  if (!fs.existsSync(modFile)) {
    throw new Error('Armor mod CSV file was not created');
  }
  
  const modContent = fs.readFileSync(modFile, 'utf-8');
  console.log('Armor mod CSV created successfully');
  console.log('Sample content:');
  console.log(modContent.split('\n').slice(0, 3).join('\n'));
  console.log('...\n');
  
  // Verify mod has energy cost
  if (!modContent.includes('energyCost')) {
    throw new Error('CSV should contain "energyCost" field');
  }
  
  console.log('✓ Armor mod export verification passed');
  
  console.log('\n=== All Integration Tests Passed ===\n');
  
  // Cleanup
  console.log(`Test files saved in: ${testDir}`);
  console.log('You can inspect the CSV files to verify the output.\n');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n✗ Integration test failed:', error.message);
  process.exit(1);
}
