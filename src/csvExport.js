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
 * Ammo type enum to human-readable name mapping
 * Reference: https://bungie-net.github.io/multi/schema_Destiny-DestinyAmmunitionType.html
 */
const AMMO_TYPES = {
  0: 'None',
  1: 'Primary',
  2: 'Special',
  3: 'Heavy'
};

/**
 * Weapon slot bucket hashes to human-readable names
 * These are DestinyInventoryBucketDefinition hashes for weapon slots
 */
const WEAPON_SLOT_BUCKETS = {
  '1498876634': 'Kinetic',
  '2465295065': 'Energy',
  '953998645': 'Power'
};

/**
 * Breaker type enum to human-readable name mapping
 * Reference: https://bungie-net.github.io/multi/schema_Destiny-DestinyBreakerType.html
 */
const BREAKER_TYPES = {
  0: 'None',
  1: 'Shield-Piercing (Anti-Barrier)',
  2: 'Disruption (Overload)',
  3: 'Stagger (Unstoppable)'
};

/**
 * Damage type enum to human-readable name mapping
 * Reference: https://bungie-net.github.io/multi/schema_Destiny-DamageType.html
 */
const DAMAGE_TYPE_NAMES = {
  0: 'None',
  1: 'Kinetic',
  2: 'Arc',
  3: 'Solar',
  4: 'Void',
  5: 'Raid',
  6: 'Stasis',
  7: 'Strand'
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
 * Resolve an enum value to a human-readable name using a mapping
 * @param {*} enumValue - The enum value to resolve
 * @param {object} mapping - Enum-to-name mapping object
 * @returns {string} - Resolved name, stringified value, or empty string
 */
function resolveEnum(enumValue, mapping) {
  if (enumValue === undefined || enumValue === null || enumValue === '') return '';
  return mapping[enumValue] || String(enumValue);
}

/**
 * Extract element name from a plugCategoryIdentifier string
 * @param {string} plugCategoryIdentifier - The plug category identifier (e.g., 'v400.plugs.aspects.solar')
 * @param {string} fallbackDamageTypeName - Fallback from resolved damage type name
 * @returns {string} - Element name (e.g., 'Solar') or empty string
 */
function extractElementFromPlugCategory(plugCategoryIdentifier, fallbackDamageTypeName) {
  const plugCat = (plugCategoryIdentifier || '').toLowerCase();
  const elementKeywords = ['arc', 'solar', 'void', 'stasis', 'strand'];
  const matched = elementKeywords.find(el => plugCat.includes(el));
  if (matched) {
    return matched.charAt(0).toUpperCase() + matched.slice(1);
  }
  return fallbackDamageTypeName || '';
}

/**
 * Transform item data to a more readable format for CSV
 * @param {object} item - Item data from Bungie API
 * @param {string} category - Category of item (weapons, armor, etc.)
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 * @returns {object} - Transformed item data
 */
function transformItemForCSV(item, category, statDefs = null) {
  // Short-circuit for passthrough categories that have their own schema
  // and don't need the generic item transform
  if (category === 'enemyWeaknesses' || category === 'statReference' || category === 'summary') {
    return item;
  }
  
  const transformed = {
    hash: item.hash,
    name: item.displayProperties?.name || '',
    description: item.displayProperties?.description || '',
    flavorText: item.flavorText || '',
    itemType: item.itemTypeDisplayName || '',
    itemTypeAndTierDisplayName: item.itemTypeAndTierDisplayName || '',
    itemSubType: item.itemSubType || '',
    tierType: item.inventory?.tierTypeName || '',
    tierTypeHash: item.inventory?.tierTypeHash || '',
    collectibleHash: item.collectibleHash || '',
  };
  
  // Add icon URL if available
  if (item.displayProperties?.icon) {
    transformed.iconUrl = `https://www.bungie.net${item.displayProperties.icon}`;
  }
  
  // Add additional Bungie API asset URLs when available
  if (item.screenshot) {
    transformed.screenshotUrl = `https://www.bungie.net${item.screenshot}`;
  }
  if (item.iconWatermark) {
    transformed.iconWatermarkUrl = `https://www.bungie.net${item.iconWatermark}`;
  }
  if (item.iconWatermarkShelved) {
    transformed.iconWatermarkShelvedUrl = `https://www.bungie.net${item.iconWatermarkShelved}`;
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
    // Weapon slot (Kinetic/Energy/Power) from inventory bucket
    const bucketHash = String(item.inventory?.bucketTypeHash || '');
    transformed.weaponSlot = WEAPON_SLOT_BUCKETS[bucketHash] || '';
    
    // Ammo type resolved to name
    transformed.ammoType = resolveEnum(item.equippingBlock?.ammoType, AMMO_TYPES);
    
    // Damage type resolved to name from enum
    transformed.defaultDamageType = resolveEnum(item.defaultDamageType, DAMAGE_TYPE_NAMES);
    transformed.damageTypeHashes = item.damageTypeHashes?.join(', ') || '';
    
    // Breaker type (intrinsic Anti-Barrier/Overload/Unstoppable on exotics)
    transformed.breakerType = resolveEnum(item.breakerType, BREAKER_TYPES);
    
    // Intrinsic perk (weapon frame/archetype) from enrichment
    if (item.enrichedIntrinsicPerk) {
      transformed.intrinsicPerkName = item.enrichedIntrinsicPerk.name || '';
      transformed.intrinsicPerkDescription = item.enrichedIntrinsicPerk.description || '';
    }
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
  } else if (category === 'subclasses') {
    // Subclasses (Void, Solar, Arc, Stasis, Strand) have class type and element type
    const classTypes = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    transformed.classType = item.classType !== undefined ? 
      (classTypes[item.classType] || 'Any') : '';
    const subDmgEnum = item.defaultDamageType || item.talentGrid?.hudDamageType || '';
    transformed.damageType = subDmgEnum;
    transformed.damageTypeName = resolveEnum(subDmgEnum, DAMAGE_TYPE_NAMES);
    transformed.itemCategoryHashes = item.itemCategoryHashes?.join(', ') || '';
  } else if (category === 'aspects' || category === 'fragments') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    const afDmgEnum = item.talentGrid?.hudDamageType || '';
    transformed.damageType = afDmgEnum;
    transformed.damageTypeName = resolveEnum(afDmgEnum, DAMAGE_TYPE_NAMES);
    transformed.element = extractElementFromPlugCategory(
      item.plug?.plugCategoryIdentifier, transformed.damageTypeName
    );
    
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
    const abilDmgEnum = item.talentGrid?.hudDamageType || '';
    transformed.damageType = abilDmgEnum;
    transformed.damageTypeName = resolveEnum(abilDmgEnum, DAMAGE_TYPE_NAMES);
    transformed.element = extractElementFromPlugCategory(
      item.plug?.plugCategoryIdentifier, transformed.damageTypeName
    );
    
    // Note: investmentStats are already processed above in the general stats handling
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
  
  // Add enriched energy type if available (populated for both armor and mods)
  if (item.enrichedEnergyType) {
    transformed.energyTypeName = item.enrichedEnergyType.name;
  }
  
  // Add intrinsic perk information (first socket typically contains intrinsic trait)
  if (item.enrichedIntrinsicPerk) {
    // Use enriched data if available (resolved name and description)
    transformed.intrinsicPerkHash = item.enrichedIntrinsicPerk.hash || '';
    if (!transformed.intrinsicPerkName) {
      transformed.intrinsicPerkName = item.enrichedIntrinsicPerk.name || '';
      transformed.intrinsicPerkDescription = item.enrichedIntrinsicPerk.description || '';
    }
  } else if (item.sockets?.socketEntries && item.sockets.socketEntries.length > 0) {
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
 * Generate summary data for build crafting counts
 * @param {object} buildData - Build crafting data object
 * @returns {array} - Array of summary objects
 */
function generateSummaryData(buildData) {
  return [
    { category: 'Weapons', count: buildData.weapons?.length || 0 },
    { category: 'Armor', count: buildData.armor?.length || 0 },
    { category: 'Armor Mods', count: buildData.armorMods?.length || 0 },
    { category: 'Subclasses', count: buildData.subclasses?.length || 0 },
    { category: 'Aspects', count: buildData.aspects?.length || 0 },
    { category: 'Fragments', count: buildData.fragments?.length || 0 },
    { category: 'Abilities', count: buildData.abilities?.length || 0 },
    { category: 'Damage Types', count: buildData.damageTypes?.length || 0 },
    { category: 'Artifact Mods', count: buildData.artifactMods?.length || 0 },
    { category: 'Champion Mods', count: buildData.championMods?.length || 0 },
    { category: 'Enemy Weaknesses', count: buildData.enemyWeaknesses?.length || 0 }
  ];
}

/**
 * Export all build crafting data to CSV files
 * @param {object} buildData - Build crafting data object
 * @param {string} outputDir - Output directory
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 */
function exportAllToCSV(buildData, outputDir, statDefs = null) {
  const exports = [
    { name: 'summary', data: generateSummaryData(buildData), category: 'summary' },
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
  resolveEnum,
  extractElementFromPlugCategory,
  generateStatReference,
  generateSummaryData,
  STAT_HASHES,
  STAT_DESCRIPTIONS,
  AMMO_TYPES,
  WEAPON_SLOT_BUCKETS,
  BREAKER_TYPES,
  DAMAGE_TYPE_NAMES
};
