const fs = require('fs');
const path = require('path');
const { json2csv } = require('json-2-csv');

/**
 * Armor 2.0 constants (duplicated from buildCrafting.js to avoid circular dependency)
 */
const ARMOR_2_0_PLUG_SET_HASH = 4163334830;
const ARMOR_2_0_STAT_PLUG_CATEGORY = 1744546145;

/**
 * Stat type hash to name mapping (fallback for when stat definitions aren't available)
 * These are common Destiny 2 stat hashes
 */
const STAT_HASHES = {
  // Armor stats (Armor 3.0 system)
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
 * Stat descriptions explaining what each stat does in-game
 * Helps users understand the effect of stats for buildcrafting
 */
const STAT_DESCRIPTIONS = {
  // Armor stats (Armor 3.0 system)
  'Mobility': 'Increases movement speed, walk speed, strafe speed, and initial jump height. Reduces dodge cooldown for Hunters.',
  'Resilience': 'Increases maximum health and shield capacity. Reduces barricade cooldown for Titans. Higher resilience means more survivability.',
  'Recovery': 'Increases the speed at which health and shields regenerate. Reduces rift cooldown for Warlocks.',
  'Discipline': 'Reduces grenade ability cooldown time.',
  'Intellect': 'Reduces super ability cooldown time.',
  'Strength': 'Reduces melee ability cooldown time.',
  
  // Weapon stats
  'Impact': 'Damage per shot or swing',
  'Range': 'Effective distance before damage falloff',
  'Stability': 'Weapon recoil control',
  'Handling': 'Speed of aiming down sights, ready, and stow',
  'Reload Speed': 'Speed of reloading',
  'RPM (Rounds Per Minute)': 'Rate of fire',
  'Aim Assistance': 'Bullet magnetism and target acquisition',
  'Recoil Direction': 'Direction of weapon recoil (higher = more vertical)',
  'Zoom': 'Magnification when aiming down sights',
  'Magazine': 'Ammo capacity per magazine',
  'Charge Time': 'Time to fully charge before firing',
  'Draw Time': 'Time to ready weapon after switching',
  'Blast Radius': 'Area of effect damage radius',
  'Velocity': 'Projectile speed',
  'Accuracy': 'Precision and consistency',
  'Shield Duration': 'How long the shield lasts',
  'Swing Speed': 'Speed of melee attacks',
  'Charge Rate': 'Speed of charging abilities'
};

/**
 * Resolve a stat hash to a human-readable name
 * @param {string|number} statHash - The stat hash to resolve
 * @param {object} statDefs - Optional stat definitions from DestinyStatDefinition
 * @returns {string} - Human-readable stat name
 */
function resolveStatName(statHash, statDefs = null) {
  const hashStr = String(statHash);
  
  // First try to use stat definitions if available
  if (statDefs && statDefs[hashStr]) {
    const statName = statDefs[hashStr].displayProperties?.name;
    if (statName) {
      return statName;
    }
  }
  
  // Fall back to hardcoded mapping
  if (STAT_HASHES[hashStr]) {
    return STAT_HASHES[hashStr];
  }
  
  // Last resort: return hash with prefix
  return `Stat_${hashStr}`;
}

/**
 * Transform item data to a more readable format for CSV
 * @param {object} item - Item data from Bungie API
 * @param {string} category - Category of item (weapons, armor, etc.)
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 * @returns {object} - Transformed item data
 */
function transformItemForCSV(item, category, statDefs = null) {
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
  
  // Use enriched stats if available (with resolved stat names)
  if (item.enrichedStats) {
    for (const [statHash, enrichedStat] of Object.entries(item.enrichedStats)) {
      const statName = enrichedStat.name;
      transformed[statName] = enrichedStat.value;
      // Add max value for reference
      if (enrichedStat.maximum && enrichedStat.maximum !== 100) {
        transformed[`${statName}_Max`] = enrichedStat.maximum;
      }
    }
  } else {
    // Fallback to old stat extraction if enriched stats not available
    // Extract stats if available
    if (item.stats?.stats) {
      for (const [statHash, statData] of Object.entries(item.stats.stats)) {
        const statName = resolveStatName(statHash, statDefs);
        transformed[statName] = statData.value || 0;
      }
    }
    
    // Extract investment stats if available (for weapons, abilities, mods, etc.)
    if (item.investmentStats) {
      item.investmentStats.forEach(stat => {
        const statName = resolveStatName(stat.statTypeHash, statDefs);
        if (!transformed[statName]) {
          transformed[statName] = stat.value || 0;
        }
      });
    }
  }
  
  // Category-specific fields
  if (category === 'weapons') {
    transformed.ammoType = item.equippingBlock?.ammoType || '';
    transformed.defaultDamageType = item.defaultDamageType || '';
    transformed.damageTypeHashes = item.damageTypeHashes?.join(', ') || '';
  } else if (category === 'armor') {
    // Map class type to readable name
    const classTypes = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    transformed.classType = item.classType !== undefined ? 
      (classTypes[item.classType] || 'Any') : '';
    
    // Add Armor 2.0 specific fields
    if (item.energy) {
      transformed.energyCapacity = item.energy.energyCapacity || 0;
      transformed.energyType = item.energy.energyType || '';
      transformed.energyTypeHash = item.energy.energyTypeHash || '';
    }
    
    // Add detailed socket information
    if (item.sockets?.socketEntries) {
      transformed.socketCount = item.sockets.socketEntries.length;
      // Count mod sockets specifically
      const modSockets = item.sockets.socketEntries.filter(s => 
        s.socketTypeHash && (
          s.plugSetHash === ARMOR_2_0_PLUG_SET_HASH || // Armor 2.0 mod socket
          s.singleInitialItemHash === ARMOR_2_0_STAT_PLUG_CATEGORY // Stat mod socket
        )
      );
      transformed.modSocketCount = modSockets.length;
    }
  } else if (category === 'armorMods') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    transformed.energyCost = item.plug?.energyCost?.energyCost || 0;
    transformed.energyType = item.plug?.energyCost?.energyTypeHash || '';
    
    // Add investment stats for mods (stat bonuses they provide)
    if (item.investmentStats && item.investmentStats.length > 0) {
      const statBonuses = item.investmentStats.map(stat => {
        const statName = resolveStatName(stat.statTypeHash, statDefs);
        return `${statName}: ${stat.value > 0 ? '+' : ''}${stat.value}`;
      }).join(', ');
      transformed.statBonuses = statBonuses;
    }
  } else if (category === 'aspects' || category === 'fragments') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    transformed.damageType = item.talentGrid?.hudDamageType || '';
    
    // Add investment stats for fragments (stat bonuses/penalties they provide)
    if (item.investmentStats && item.investmentStats.length > 0) {
      const statBonuses = item.investmentStats.map(stat => {
        const statName = resolveStatName(stat.statTypeHash, statDefs);
        return `${statName}: ${stat.value > 0 ? '+' : ''}${stat.value}`;
      }).join(', ');
      transformed.statBonuses = statBonuses;
    }
  } else if (category === 'abilities') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    transformed.damageType = item.talentGrid?.hudDamageType || '';
    
    // Note: investmentStats are already processed above in the general stats handling (lines 119-127)
    // This creates individual columns for each stat rather than concatenating them
  } else if (category === 'damageTypes') {
    // Special handling for damage types
    transformed.enumValue = item.enumValue || '';
    transformed.transparentIconPath = item.transparentIconPath ? `https://www.bungie.net${item.transparentIconPath}` : '';
    transformed.showIcon = item.showIcon || false;
    transformed.color = item.color ? JSON.stringify(item.color) : '';
  } else if (category === 'artifactMods' || category === 'championMods') {
    // Special handling for artifact and champion mods
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    transformed.energyCost = item.plug?.energyCost?.energyCost || 0;
    transformed.energyType = item.plug?.energyCost?.energyTypeHash || '';
    transformed.seasonHash = item.seasonHash || '';
    
    // Add investment stats if available
    if (item.investmentStats && item.investmentStats.length > 0) {
      const statBonuses = item.investmentStats.map(stat => {
        const statName = resolveStatName(stat.statTypeHash, statDefs);
        return `${statName}: ${stat.value > 0 ? '+' : ''}${stat.value}`;
      }).join(', ');
      transformed.statBonuses = statBonuses;
    }
  } else if (category === 'statReference') {
    // Stat reference is already in the correct format
    // Just return the item as-is since it's already structured properly
    return item;
  }
  
  // Add enriched perks if available (with names and descriptions)
  if (item.enrichedPerks && item.enrichedPerks.length > 0) {
    transformed.perkNames = item.enrichedPerks
      .filter(p => p.isDisplayable)
      .map(p => p.name)
      .join(', ');
    transformed.perkDescriptions = item.enrichedPerks
      .filter(p => p.isDisplayable)
      .map(p => `${p.name}: ${p.description}`)
      .join(' | ');
  } else if (item.perks && item.perks.length > 0) {
    // Fallback to hash if enriched perks not available
    transformed.perks = item.perks.map(p => p.perkHash).join(', ');
  }
  
  // Add enriched damage type if available
  if (item.enrichedDamageType) {
    transformed.damageTypeName = item.enrichedDamageType.name;
    transformed.damageTypeDescription = item.enrichedDamageType.description;
  }
  
  // Add intrinsic perk information (first socket typically contains intrinsic trait)
  if (item.sockets?.socketEntries && item.sockets.socketEntries.length > 0) {
    const intrinsicSocket = item.sockets.socketEntries[0];
    if (intrinsicSocket?.singleInitialItemHash) {
      transformed.intrinsicPerkHash = intrinsicSocket.singleInitialItemHash;
    }
  }
  
  // Add sockets information if not already added
  if (transformed.socketCount === undefined && item.sockets?.socketEntries) {
    transformed.socketCount = item.sockets.socketEntries.length;
  }
  
  return transformed;
}

/**
 * Transform array of items to CSV-friendly format
 * @param {object[]} items - Array of items
 * @param {string} category - Category name
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 * @returns {object[]} - Transformed items
 */
function transformItemsForCSV(items, category, statDefs = null) {
  return items.map(item => transformItemForCSV(item, category, statDefs));
}

/**
 * Export data to CSV file
 * @param {object[]} data - Array of objects to export
 * @param {string} filename - Output filename
 * @param {string} category - Category name for transformation
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
function exportToCSV(data, filename, category, statDefs = null) {
  try {
    // Transform the data to be more CSV-friendly
    const transformedData = transformItemsForCSV(data, category, statDefs);
    
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
 * Generate stat reference data for buildcrafting
 * Returns a list of all stats with their descriptions
 * @returns {object[]} - Array of stat reference objects
 */
function generateStatReference() {
  const statReference = [];
  
  // Add armor stats (Armor 3.0 system)
  const armorStats = ['Mobility', 'Resilience', 'Recovery', 'Discipline', 'Intellect', 'Strength'];
  armorStats.forEach(statName => {
    if (STAT_DESCRIPTIONS[statName]) {
      statReference.push({
        statName,
        category: 'Armor Stats (Armor 3.0)',
        description: STAT_DESCRIPTIONS[statName],
        relevantFor: 'Armor, Abilities, Fragments, Aspects, Armor Mods'
      });
    }
  });
  
  // Add weapon stats - dynamically get all weapon stats from STAT_DESCRIPTIONS
  const weaponStats = Object.keys(STAT_DESCRIPTIONS).filter(statName => 
    !armorStats.includes(statName)
  );
  
  weaponStats.forEach(statName => {
    statReference.push({
      statName,
      category: 'Weapon Stats',
      description: STAT_DESCRIPTIONS[statName],
      relevantFor: 'Weapons'
    });
  });
  
  return statReference;
}

/**
 * Export all build crafting data to CSV files
 * @param {object} buildData - Build crafting data object
 * @param {string} outputDir - Output directory
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
function exportAllToCSV(buildData, outputDir, statDefs = null) {
  const exports = [
    { name: 'weapons', data: buildData.weapons, category: 'weapons' },
    { name: 'armor', data: buildData.armor, category: 'armor' },
    { name: 'armor-mods', data: buildData.armorMods, category: 'armorMods' },
    { name: 'subclasses', data: buildData.subclasses, category: 'subclasses' },
    { name: 'aspects', data: buildData.aspects, category: 'aspects' },
    { name: 'fragments', data: buildData.fragments, category: 'fragments' },
    { name: 'abilities', data: buildData.abilities, category: 'abilities' },
    { name: 'damage-types', data: buildData.damageTypes, category: 'damageTypes' },
    { name: 'artifact-mods', data: buildData.artifactMods, category: 'artifactMods' },
    { name: 'champion-mods', data: buildData.championMods, category: 'championMods' },
    { name: 'enemy-weaknesses', data: buildData.enemyWeaknesses, category: 'enemyWeaknesses' },
    { name: 'stat-reference', data: generateStatReference(), category: 'statReference' }
  ];
  
  for (const { name, data, category } of exports) {
    if (data && data.length > 0) {
      const filename = path.join(outputDir, `${name}.csv`);
      exportToCSV(data, filename, category, statDefs);
    }
  }
}

module.exports = {
  exportToCSV,
  exportAllToCSV,
  transformItemForCSV,
  transformItemsForCSV,
  resolveStatName,
  generateStatReference,
  STAT_HASHES,
  STAT_DESCRIPTIONS
};
