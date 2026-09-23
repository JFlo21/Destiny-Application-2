const fs = require('fs');
const path = require('path');
const { json2csv } = require('json-2-csv');
const {
  ARMOR_2_0_PLUG_SET_HASH,
  ARMOR_2_0_STAT_PLUG_CATEGORY,
  STAT_HASHES,
  AMMO_TYPES,
  ENERGY_TYPE_NAMES,
  WEAPON_SLOT_BUCKETS,
  BREAKER_TYPES,
  DAMAGE_TYPE_NAMES,
  CLASS_TYPES,
  FRAGMENT_SLOTS_STAT_HASH,
} = require('./constants');
const { EXPORT_CATEGORIES } = require('./categories');

/**
 * Stat descriptions explaining what each stat does in-game
 * Helps users understand the effect of stats for buildcrafting
 * Updated for current Destiny 2 (post-Lightfall universal mod system)
 */
const STAT_DESCRIPTIONS = {
  // Armor stats (current universal mod system, post-Lightfall)
  'Mobility': 'Increases movement speed, walk speed, strafe speed, and initial jump height. Reduces dodge cooldown for Hunters.',
  'Resilience': 'Increases damage resistance in PvE, reducing all incoming damage at higher tiers. Provides increased shield capacity in PvP. Reduces barricade cooldown for Titans. Critical stat for endgame survivability.',
  'Recovery': 'Increases the speed at which health and shields regenerate. Reduces rift cooldown for Warlocks.',
  'Discipline': 'Reduces grenade ability cooldown time.',
  'Intellect': 'Reduces super ability cooldown time. Has reduced effectiveness compared to pre-Lightfall due to passive super gain changes.',
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
 * Supports all current subclass elements: Arc, Solar, Void, Stasis, Strand, and Prismatic.
 * Prismatic (from The Final Shape) combines Light and Darkness elements.
 * @param {string} plugCategoryIdentifier - The plug category identifier (e.g., 'v400.plugs.aspects.solar')
 * @param {string} fallbackDamageTypeName - Fallback from resolved damage type name
 * @returns {string} - Element name (e.g., 'Solar', 'Prismatic') or empty string
 */
function extractElementFromPlugCategory(plugCategoryIdentifier, fallbackDamageTypeName) {
  const plugCat = (plugCategoryIdentifier || '').toLowerCase();
  const elementKeywords = ['arc', 'solar', 'void', 'stasis', 'strand', 'prismatic'];
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
    loreHash: item.loreHash || '',
    seasonHash: item.seasonHash || '',
    isAdept: item.isAdept || false,
    displaySource: item.displaySource || '',
    traitIds: item.traitIds?.join(', ') || '',
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
  
  // Add tooltip notifications if available (extra descriptions shown in-game)
  if (item.tooltipNotifications && item.tooltipNotifications.length > 0) {
    transformed.tooltipNotifications = item.tooltipNotifications
      .map(n => n.displayString)
      .filter(Boolean)
      .join(' | ');
  }
  
  // Use enriched stats if available (with resolved stat names)
  if (item.enrichedStats) {
    for (const enrichedStat of Object.values(item.enrichedStats)) {
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
    
    // Damage type: `damageType` is the resolved name, `damageTypeEnum` the raw enum
    transformed.damageTypeEnum = item.defaultDamageType ?? '';
    transformed.damageType = resolveEnum(item.defaultDamageType, DAMAGE_TYPE_NAMES);
    // Kept for backward compatibility with older sheets/tests
    transformed.defaultDamageType = transformed.damageType;
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
    const classTypes = CLASS_TYPES;
    transformed.classType = item.classType !== undefined ? 
      (classTypes[item.classType] || 'Any') : '';
    
    // Armor energy fields (post-Lightfall: energy type no longer restricts mod compatibility)
    if (item.energy) {
      transformed.energyCapacity = item.energy.energyCapacity || 0;
      transformed.energyType = item.energy.energyType || '';
      transformed.energyTypeHash = item.energy.energyTypeHash || '';
    }
    
    // Resolve energy type name from enrichment (DestinyEnergyTypeDefinition)
    if (item.enrichedEnergyType) {
      transformed.energyTypeName = item.enrichedEnergyType.name || '';
      transformed.energyTypeDescription = item.enrichedEnergyType.description || '';
    }
    
    // Add detailed socket information
    if (item.sockets?.socketEntries) {
      transformed.socketCount = item.sockets.socketEntries.length;
      // Count mod sockets specifically
      const modSockets = item.sockets.socketEntries.filter(s => 
        s.socketTypeHash && (
          s.plugSetHash === ARMOR_2_0_PLUG_SET_HASH || // Armor mod socket
          s.singleInitialItemHash === ARMOR_2_0_STAT_PLUG_CATEGORY // Stat mod socket
        )
      );
      transformed.modSocketCount = modSockets.length;
    }
  } else if (category === 'armorMods') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    transformed.energyCost = item.plug?.energyCost?.energyCost || 0;
    transformed.energyTypeHash = item.plug?.energyCost?.energyTypeHash || '';
    transformed.energyTypeEnum = item.plug?.energyCost?.energyType ?? '';
    
    // Resolve energy type name from enrichment (DestinyEnergyTypeDefinition)
    // Post-Lightfall: mods no longer require matching energy type, but the cost type is still tracked
    // Per Bungie API openapi.json, energyCost.energyType is the DestinyEnergyType enum value
    if (item.enrichedEnergyType) {
      transformed.energyTypeName = item.enrichedEnergyType.name || '';
    } else if (item.plug?.energyCost?.energyType !== undefined) {
      // Fallback to enum resolution if enrichment not available
      transformed.energyTypeName = resolveEnum(item.plug.energyCost.energyType, ENERGY_TYPE_NAMES);
    }
    
    // Add investment stats for mods (stat bonuses they provide)
    if (item.investmentStats && item.investmentStats.length > 0) {
      const statBonuses = item.investmentStats.map(stat => {
        const statName = resolveStatName(stat.statTypeHash, statDefs);
        return `${statName}: ${stat.value > 0 ? '+' : ''}${stat.value}`;
      }).join(', ');
      transformed.statBonuses = statBonuses;
    }
  } else if (category === 'subclasses') {
    // Subclasses: Arc, Solar, Void, Stasis, Strand, and Prismatic
    // Prismatic (The Final Shape) combines Light and Darkness elements
    transformed.classType = item.classType !== undefined ?
      (CLASS_TYPES[item.classType] || 'Any') : '';
    const subDmgEnum = item.defaultDamageType || item.talentGrid?.hudDamageType || '';
    // `damageType` is the resolved name; `damageTypeEnum` keeps the raw enum number
    transformed.damageTypeEnum = subDmgEnum;
    transformed.damageType = resolveEnum(subDmgEnum, DAMAGE_TYPE_NAMES);
    transformed.damageTypeName = transformed.damageType;
    transformed.itemCategoryHashes = item.itemCategoryHashes?.join(', ') || '';
  } else if (category === 'aspects' || category === 'fragments') {
    transformed.plugCategoryIdentifier = item.plug?.plugCategoryIdentifier || '';
    const afDmgEnum = item.talentGrid?.hudDamageType || '';
    transformed.damageTypeEnum = afDmgEnum;
    transformed.damageType = resolveEnum(afDmgEnum, DAMAGE_TYPE_NAMES);
    transformed.damageTypeName = transformed.damageType;
    transformed.element = extractElementFromPlugCategory(
      item.plug?.plugCategoryIdentifier, transformed.damageTypeName
    );

    // Aspects: derive number of fragment slots granted from investmentStats
    // (stat hash 2223994109 "Fragment Slots" / subclass energy capacity)
    if (category === 'aspects' && item.investmentStats?.length) {
      const fragmentSlotStat = item.investmentStats.find(
        (stat) => Number(stat.statTypeHash) === FRAGMENT_SLOTS_STAT_HASH
      );
      if (fragmentSlotStat) {
        transformed.fragmentSlots = fragmentSlotStat.value || 0;
      }
    }

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
    transformed.damageTypeEnum = abilDmgEnum;
    transformed.damageType = resolveEnum(abilDmgEnum, DAMAGE_TYPE_NAMES);
    transformed.damageTypeName = transformed.damageType;
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
    transformed.energyTypeHash = item.plug?.energyCost?.energyTypeHash || '';
    transformed.energyTypeEnum = item.plug?.energyCost?.energyType ?? '';

    // Breaker type (which champion type this mod stuns), when present
    if (item.breakerType !== undefined) {
      transformed.breakerType = resolveEnum(item.breakerType, BREAKER_TYPES);
    }

    // Artifact and champion mods carry an isCurrentSeason flag from their getters
    if (
      (category === 'artifactMods' || category === 'championMods') &&
      item.isCurrentSeason !== undefined
    ) {
      transformed.isCurrentSeason = Boolean(item.isCurrentSeason);
    }
    
    // Resolve energy type name (from enrichment or enum fallback)
    if (item.enrichedEnergyType) {
      transformed.energyTypeName = item.enrichedEnergyType.name || '';
    } else if (item.plug?.energyCost?.energyType !== undefined) {
      transformed.energyTypeName = resolveEnum(item.plug.energyCost.energyType, ENERGY_TYPE_NAMES);
    }
    
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
    // Enriched (DestinyDamageTypeDefinition) name is authoritative for both columns
    transformed.damageType = item.enrichedDamageType.name;
    transformed.damageTypeName = item.enrichedDamageType.name;
    transformed.damageTypeDescription = item.enrichedDamageType.description;
    if (item.enrichedDamageType.enumValue !== undefined) {
      transformed.damageTypeEnum = item.enrichedDamageType.enumValue;
    }
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
  
  // Add enriched lore text if available (resolved from DestinyLoreDefinition)
  if (item.enrichedLore) {
    transformed.loreName = item.enrichedLore.name || '';
    transformed.loreDescription = item.enrichedLore.description || '';
    transformed.loreSubtitle = item.enrichedLore.subtitle || '';
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
  
  // Add armor stats (current universal mod system, post-Lightfall)
  const armorStats = ['Mobility', 'Resilience', 'Recovery', 'Discipline', 'Intellect', 'Strength'];
  armorStats.forEach(statName => {
    if (STAT_DESCRIPTIONS[statName]) {
      statReference.push({
        statName,
        category: 'Armor Stats',
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
  // Built from the shared category list plus the summary/statReference synthetics
  const exports = [
    { name: 'summary', data: generateSummaryData(buildData), category: 'summary' },
    ...EXPORT_CATEGORIES.map(({ key, category, fileName }) => ({
      name: fileName,
      data: key === 'statReference' ? generateStatReference() : buildData[key],
      category,
    })),
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
  ENERGY_TYPE_NAMES,
  WEAPON_SLOT_BUCKETS,
  BREAKER_TYPES,
  DAMAGE_TYPE_NAMES
};
