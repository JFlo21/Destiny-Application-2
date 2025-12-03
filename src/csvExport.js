const fs = require('fs');
const path = require('path');
const { json2csv } = require('json-2-csv');

/**
 * Stat type hash to name mapping
 * These are common Destiny 2 stat hashes
 */
const STAT_HASHES = {
  // Armor stats
  '2996146975': 'Mobility',
  '392767087': 'Resilience',
  '1943323491': 'Recovery',
  '1735777505': 'Discipline',
  '144602215': 'Intellect',
  '4244567218': 'Strength',
  
  // Weapon stats
  '4284893193': 'RPM (Rounds Per Minute)',
  '4043523819': 'Impact',
  '1240592695': 'Range',
  '155624089': 'Stability',
  '943549884': 'Handling',
  '4188031367': 'Reload Speed',
  '1345609583': 'Aim Assistance',
  '2715839340': 'Recoil Direction',
  '3555269338': 'Zoom',
  '3871231066': 'Magazine',
  '2961396640': 'Charge Time',
  '447667954': 'Draw Time',
  '925767036': 'Ammo Capacity',
  '1931675084': 'Inventory Size',
  '3614673599': 'Blast Radius',
  '2523465841': 'Velocity',
  '1591432999': 'Accuracy',
  '3597844532': 'Shield Duration',
  '1546607977': 'Guard Resistance',
  '209426660': 'Guard Efficiency',
  '3022301683': 'Guard Endurance',
  '2837207746': 'Swing Speed',
  '1486958981': 'Charge Rate'
};

/**
 * Transform item data to a more readable format for CSV
 * @param {object} item - Item data from Bungie API
 * @param {string} category - Category of item (weapons, armor, etc.)
 * @returns {object} - Transformed item data
 */
function transformItemForCSV(item, category) {
  const transformed = {
    hash: item.hash,
    name: item.displayProperties?.name || '',
    description: item.displayProperties?.description || '',
    itemType: item.itemTypeDisplayName || '',
    itemSubType: item.itemSubType || '',
    tierType: item.inventory?.tierTypeName || '',
    tierTypeHash: item.inventory?.tierTypeHash || '',
  };
  
  // Add icon URL if available
  if (item.displayProperties?.icon) {
    transformed.iconUrl = `https://www.bungie.net${item.displayProperties.icon}`;
  }
  
  // Extract stats if available
  if (item.stats?.stats) {
    for (const [statHash, statData] of Object.entries(item.stats.stats)) {
      const statName = STAT_HASHES[statHash] || `Stat_${statHash}`;
      transformed[statName] = statData.value || 0;
    }
  }
  
  // Extract investment stats if available (for weapons)
  if (item.investmentStats) {
    item.investmentStats.forEach(stat => {
      const statName = STAT_HASHES[stat.statTypeHash] || `Stat_${stat.statTypeHash}`;
      if (!transformed[statName]) {
        transformed[statName] = stat.value || 0;
      }
    });
  }
  
  // Category-specific fields
  if (category === 'weapons') {
    transformed.ammoType = item.equippingBlock?.ammoType || '';
    transformed.defaultDamageType = item.defaultDamageType || '';
    transformed.damageTypeHashes = item.damageTypeHashes?.join(', ') || '';
  } else if (category === 'armor') {
    transformed.classType = item.classType !== undefined ? 
      (item.classType === 0 ? 'Titan' : item.classType === 1 ? 'Hunter' : item.classType === 2 ? 'Warlock' : 'Any') : '';
  } else if (category === 'armorMods') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    transformed.energyCost = item.plug?.energyCost?.energyCost || 0;
    transformed.energyType = item.plug?.energyCost?.energyTypeHash || '';
  } else if (category === 'aspects' || category === 'fragments') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    transformed.damageType = item.talentGrid?.hudDamageType || '';
  }
  
  // Add perks if available
  if (item.perks && item.perks.length > 0) {
    transformed.perks = item.perks.map(p => p.perkHash).join(', ');
  }
  
  // Add sockets information
  if (item.sockets?.socketEntries) {
    transformed.socketCount = item.sockets.socketEntries.length;
  }
  
  return transformed;
}

/**
 * Transform array of items to CSV-friendly format
 * @param {object[]} items - Array of items
 * @param {string} category - Category name
 * @returns {object[]} - Transformed items
 */
function transformItemsForCSV(items, category) {
  return items.map(item => transformItemForCSV(item, category));
}

/**
 * Export data to CSV file
 * @param {object[]} data - Array of objects to export
 * @param {string} filename - Output filename
 * @param {string} category - Category name for transformation
 */
function exportToCSV(data, filename, category) {
  try {
    // Transform the data to be more CSV-friendly
    const transformedData = transformItemsForCSV(data, category);
    
    // Convert to CSV
    const csv = json2csv(transformedData, {
      expandArrayObjects: true,
      emptyFieldValue: '',
      sortHeader: false
    });
    
    // Write to file
    fs.writeFileSync(filename, csv);
    console.log(`Exported ${data.length} ${category} to ${filename}`);
    
  } catch (error) {
    console.error(`Error exporting ${category} to CSV:`, error.message);
    throw error;
  }
}

/**
 * Export all build crafting data to CSV files
 * @param {object} buildData - Build crafting data object
 * @param {string} outputDir - Output directory
 */
function exportAllToCSV(buildData, outputDir) {
  const exports = [
    { name: 'weapons', data: buildData.weapons, category: 'weapons' },
    { name: 'armor', data: buildData.armor, category: 'armor' },
    { name: 'armor-mods', data: buildData.armorMods, category: 'armorMods' },
    { name: 'subclasses', data: buildData.subclasses, category: 'subclasses' },
    { name: 'aspects', data: buildData.aspects, category: 'aspects' },
    { name: 'fragments', data: buildData.fragments, category: 'fragments' }
  ];
  
  for (const { name, data, category } of exports) {
    if (data && data.length > 0) {
      const filename = path.join(outputDir, `${name}.csv`);
      exportToCSV(data, filename, category);
    }
  }
}

module.exports = {
  exportToCSV,
  exportAllToCSV,
  transformItemForCSV,
  transformItemsForCSV,
  STAT_HASHES
};
