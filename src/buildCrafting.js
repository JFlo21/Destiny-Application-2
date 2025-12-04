const { getManifest, downloadManifestComponent, getDefinitionPath } = require('./manifest');
const { exportEnemyWeaknessData } = require('./enemyWeaknesses');

/**
 * Item categories for filtering
 */
const ITEM_CATEGORIES = {
  WEAPON: 1, // Weapon category
  ARMOR: 20, // Armor category
  ARMOR_MODS: 59, // Armor Mods category
  GHOST: 39, // Ghost category
  SUBCLASS: 1403, // Subclass category
};

/**
 * Item subtypes for weapons
 */
const WEAPON_TYPES = {
  AUTO_RIFLE: 6,
  SHOTGUN: 7,
  MACHINE_GUN: 8,
  HAND_CANNON: 9,
  ROCKET_LAUNCHER: 10,
  FUSION_RIFLE: 11,
  SNIPER_RIFLE: 12,
  PULSE_RIFLE: 13,
  SCOUT_RIFLE: 14,
  SIDEARM: 17,
  SWORD: 18,
  LINEAR_FUSION: 22,
  GRENADE_LAUNCHER: 23,
  SUBMACHINE_GUN: 24,
  TRACE_RIFLE: 25,
  BOW: 26,
  GLAIVE: 27
};

/**
 * Armor types
 */
const ARMOR_TYPES = {
  HELMET: 26,
  GAUNTLETS: 27,
  CHEST: 28,
  LEGS: 29,
  CLASS_ITEM: 30
};

/**
 * Plug category identifiers for subclass elements.
 * These can be used to further filter subclass-related items.
 */
const SUBCLASS_PLUG_CATEGORIES = {
  ASPECTS: 'aspects',
  FRAGMENTS: 'fragments',
  SUPER: 'super',
  GRENADE: 'grenade',
  MELEE: 'melee',
  CLASS_ABILITY: 'class_ability'
};

/**
 * Armor 2.0 related constants
 * Armor 2.0 items have energy capacity and support the mod socket system
 */
const ARMOR_2_0_PLUG_SET_HASH = 4163334830; // Common Armor 2.0 plug set hash
const ARMOR_2_0_STAT_PLUG_CATEGORY = 1744546145; // Stat mod plug category hash

/**
 * Cache for manifest data
 */
let manifestCache = null;
let definitionsCache = {};

/**
 * Loads the manifest and caches it
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Manifest data
 */
async function loadManifest(client) {
  if (!manifestCache) {
    console.log('Loading Destiny 2 manifest...');
    manifestCache = await getManifest(client);
    console.log('Manifest loaded successfully');
  }
  return manifestCache;
}

/**
 * Loads a definition table from the manifest
 * @param {object} client - Bungie API client
 * @param {string} tableName - Name of the definition table
 * @returns {Promise<object>} - Definition data
 */
async function loadDefinitions(client, tableName) {
  if (!definitionsCache[tableName]) {
    const manifest = await loadManifest(client);
    const path = getDefinitionPath(manifest, tableName);
    console.log(`Loading ${tableName}...`);
    definitionsCache[tableName] = await downloadManifestComponent(path);
    console.log(`${tableName} loaded successfully`);
  }
  return definitionsCache[tableName];
}

/**
 * Loads stat definitions for looking up stat names
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Stat definitions
 */
async function loadStatDefinitions(client) {
  return await loadDefinitions(client, 'DestinyStatDefinition');
}

/**
 * Loads perk definitions for resolving perk hashes
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Perk definitions (DestinySandboxPerkDefinition)
 */
async function loadPerkDefinitions(client) {
  return await loadDefinitions(client, 'DestinySandboxPerkDefinition');
}

/**
 * Loads damage type definitions
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Damage type definitions
 */
async function loadDamageTypeDefinitions(client) {
  return await loadDefinitions(client, 'DestinyDamageTypeDefinition');
}

/**
 * Enrich item with resolved stat names and values
 * @param {object} item - Item to enrich
 * @param {object} statDefs - Stat definitions
 * @returns {object} - Item with enriched stats
 */
function enrichItemWithStats(item, statDefs) {
  if (!item.stats || !item.stats.stats) {
    return item;
  }
  
  // Create a new stats object with resolved names
  const enrichedStats = {};
  
  for (const [statHash, statData] of Object.entries(item.stats.stats)) {
    const statDef = statDefs[statHash];
    const statName = statDef?.displayProperties?.name || `Unknown_${statHash}`;
    const statDescription = statDef?.displayProperties?.description || '';
    
    enrichedStats[statHash] = {
      hash: statHash,
      name: statName,
      description: statDescription,
      value: statData.value || 0,
      minimum: statData.minimum || 0,
      maximum: statData.maximum || 100,
      displayMaximum: statData.displayMaximum
    };
  }
  
  // Add the enriched stats to the item
  return {
    ...item,
    enrichedStats
  };
}

/**
 * Enrich item with resolved perk information
 * @param {object} item - Item to enrich
 * @param {object} perkDefs - Perk definitions
 * @param {object} damageTypeDefs - Damage type definitions
 * @returns {object} - Item with enriched perks
 */
function enrichItemWithPerks(item, perkDefs, damageTypeDefs) {
  const enrichedPerks = [];
  
  // Extract perks from the item
  if (item.perks && item.perks.length > 0) {
    for (const perk of item.perks) {
      const perkDef = perkDefs[perk.perkHash];
      if (perkDef) {
        enrichedPerks.push({
          hash: perk.perkHash,
          name: perkDef.displayProperties?.name || `Unknown_${perk.perkHash}`,
          description: perkDef.displayProperties?.description || '',
          icon: perkDef.displayProperties?.icon ? `https://www.bungie.net${perkDef.displayProperties.icon}` : '',
          isDisplayable: perkDef.isDisplayable || false
        });
      }
    }
  }
  
  // Extract sockets/plugs for more detailed perk information
  const enrichedSockets = [];
  if (item.sockets && item.sockets.socketEntries) {
    for (const socket of item.sockets.socketEntries) {
      if (socket.singleInitialItemHash) {
        const socketData = {
          socketTypeHash: socket.socketTypeHash,
          singleInitialItemHash: socket.singleInitialItemHash,
          reusablePlugSetHash: socket.reusablePlugSetHash
        };
        enrichedSockets.push(socketData);
      }
    }
  }
  
  // Enrich damage types if available
  let enrichedDamageType = null;
  if (item.defaultDamageType && damageTypeDefs) {
    const damageTypeDef = damageTypeDefs[item.defaultDamageType];
    if (damageTypeDef) {
      enrichedDamageType = {
        hash: item.defaultDamageType,
        name: damageTypeDef.displayProperties?.name || `Unknown_${item.defaultDamageType}`,
        description: damageTypeDef.displayProperties?.description || '',
        enumValue: damageTypeDef.enumValue
      };
    }
  }
  
  return {
    ...item,
    enrichedPerks,
    enrichedSockets,
    enrichedDamageType
  };
}

/**
 * Enrich items with stat definitions
 * @param {object[]} items - Items to enrich
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Enriched items
 */
async function enrichItemsWithStatNames(items, client) {
  const statDefs = await loadStatDefinitions(client);
  return items.map(item => enrichItemWithStats(item, statDefs));
}

/**
 * Enrich items with comprehensive data (stats, perks, damage types)
 * @param {object[]} items - Items to enrich
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Fully enriched items
 */
async function enrichItems(items, client) {
  console.log('Loading definitions for enrichment...');
  const statDefs = await loadStatDefinitions(client);
  const perkDefs = await loadPerkDefinitions(client);
  const damageTypeDefs = await loadDamageTypeDefinitions(client);
  
  return items.map(item => {
    let enriched = enrichItemWithStats(item, statDefs);
    enriched = enrichItemWithPerks(enriched, perkDefs, damageTypeDefs);
    return enriched;
  });
}

/**
 * Filters items by category
 * @param {object} items - Item definitions
 * @param {number} categoryHash - Category hash to filter by
 * @returns {object[]} - Filtered items
 */
function filterByCategory(items, categoryHash) {
  return Object.values(items).filter(item => {
    return item.itemCategoryHashes && item.itemCategoryHashes.includes(categoryHash);
  });
}

/**
 * Gets all weapons from the manifest
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of weapon definitions
 */
async function getWeapons(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  return filterByCategory(items, ITEM_CATEGORIES.WEAPON);
}

/**
 * Check if an armor item is Armor 2.0 (has energy capacity and mod slots)
 * @param {object} item - Armor item to check
 * @returns {boolean} - True if item is Armor 2.0
 */
function isArmor2_0(item) {
  // Armor 2.0 items have energy capacity
  if (item.energy && item.energy.energyCapacity > 0) {
    return true;
  }
  
  // Also check for the presence of stat mod sockets (Armor 2.0 specific)
  if (item.sockets && item.sockets.socketEntries) {
    return item.sockets.socketEntries.some(socket => {
      return socket.plugSetHash === ARMOR_2_0_PLUG_SET_HASH ||
             socket.singleInitialItemHash === ARMOR_2_0_STAT_PLUG_CATEGORY;
    });
  }
  
  return false;
}

/**
 * Gets all armor from the manifest (Armor 2.0 only)
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of armor definitions
 */
async function getArmor(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  const allArmor = filterByCategory(items, ITEM_CATEGORIES.ARMOR);
  
  // Filter for Armor 2.0 only (excludes legacy armor with old mod system)
  return allArmor.filter(item => isArmor2_0(item));
}

/**
 * Armor 2.0 mod identifier patterns
 */
const ARMOR_2_0_MOD_IDENTIFIERS = ['v2', 'enhancements', 'armor_tier'];

/**
 * Gets all armor mods from the manifest (Armor 2.0 mods only)
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of armor mod definitions
 */
async function getArmorMods(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  const allMods = filterByCategory(items, ITEM_CATEGORIES.ARMOR_MODS);
  
  // Filter for Armor 2.0 mods only (those with energy costs)
  return allMods.filter(mod => {
    // Armor 2.0 mods have energy costs in their plug definition
    if (mod.plug && mod.plug.energyCost) {
      return true;
    }
    
    // Also include mods with plugCategoryIdentifier containing Armor 2.0 patterns
    if (mod.plug && mod.plug.plugCategoryIdentifier) {
      const identifier = mod.plug.plugCategoryIdentifier.toLowerCase();
      return ARMOR_2_0_MOD_IDENTIFIERS.some(pattern => identifier.includes(pattern));
    }
    
    return false;
  });
}

/**
 * Gets subclass-related items (aspects, fragments, abilities)
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Object containing aspects, fragments, and abilities
 */
async function getSubclassItems(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  
  // Get all subclass items
  const subclassItems = filterByCategory(items, ITEM_CATEGORIES.SUBCLASS);
  
  // Aspects have specific plug category identifiers
  // Look for items that have "aspect" in their plug category or item type
  const aspects = Object.values(items).filter(item => {
    if (!item.plug) return false;
    
    const plugCat = item.plug.plugCategoryIdentifier?.toLowerCase() || '';
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    
    // Match aspects by plug category identifier or item type
    return plugCat.includes('aspect') || itemType.includes('aspect');
  });
  
  // Fragments have specific plug category identifiers  
  // Look for items that have "fragment" in their plug category or item type
  const fragments = Object.values(items).filter(item => {
    if (!item.plug) return false;
    
    const plugCat = item.plug.plugCategoryIdentifier?.toLowerCase() || '';
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    
    // Match fragments by plug category identifier or item type
    return plugCat.includes('fragment') || itemType.includes('fragment');
  });
  
  // Get subclass abilities (grenades, melees, class abilities, supers)
  const abilities = Object.values(items).filter(item => {
    if (!item.plug) return false;
    
    const plugCat = item.plug.plugCategoryIdentifier?.toLowerCase() || '';
    
    // Match common subclass ability identifiers
    return plugCat.includes('grenades') ||
           plugCat.includes('melee') ||
           plugCat.includes('class_abilities') ||
           plugCat.includes('super') ||
           plugCat.includes('v400.plugs.abilities');
  });
  
  return {
    subclasses: subclassItems,
    aspects,
    fragments,
    abilities
  };
}

/**
 * Gets aspects from the manifest
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of aspect definitions
 */
async function getAspects(client) {
  const subclassItems = await getSubclassItems(client);
  return subclassItems.aspects;
}

/**
 * Gets fragments from the manifest
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of fragment definitions
 */
async function getFragments(client) {
  const subclassItems = await getSubclassItems(client);
  return subclassItems.fragments;
}

/**
 * Gets all damage type definitions
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of damage type definitions
 */
async function getDamageTypes(client) {
  const damageTypeDefs = await loadDamageTypeDefinitions(client);
  return Object.values(damageTypeDefs).filter(dt => 
    dt.displayProperties && dt.displayProperties.name
  );
}

/**
 * Gets artifact mods (seasonal artifact mods)
 * Artifact mods are typically plugs with specific identifiers
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of artifact mod definitions
 */
async function getArtifactMods(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  
  // Artifact mods have specific patterns in their plug category or item type
  return Object.values(items).filter(item => {
    if (!item.plug) return false;
    
    const plugCat = item.plug.plugCategoryIdentifier?.toLowerCase() || '';
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    
    // Artifact mods typically have "artifact" in their identifier or type
    // They also have seasonal characteristics
    return (plugCat.includes('artifact') || 
            itemType.includes('artifact') ||
            (item.seasonHash && item.plug.plugCategoryHash)) &&
           item.displayProperties?.name; // Filter out unnamed items
  });
}

/**
 * Gets champion mods (anti-barrier, overload, unstoppable)
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of champion mod definitions
 */
async function getChampionMods(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  
  return Object.values(items).filter(item => {
    if (!item.plug) return false;
    
    const name = item.displayProperties?.name?.toLowerCase() || '';
    const description = item.displayProperties?.description?.toLowerCase() || '';
    
    // Champion mods have "barrier", "overload", or "unstoppable" in name or description
    return (name.includes('barrier') || 
            name.includes('overload') || 
            name.includes('unstoppable') ||
            description.includes('barrier') ||
            description.includes('overload') ||
            description.includes('unstoppable')) &&
           item.itemCategoryHashes && 
           item.itemCategoryHashes.includes(ITEM_CATEGORIES.ARMOR_MODS);
  });
}

/**
 * Gets all build crafting related data
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Object containing all build crafting data
 */
async function getAllBuildCraftingData(client) {
  console.log('\n=== Fetching Build Crafting Data ===\n');
  
  const weapons = await getWeapons(client);
  console.log(`Found ${weapons.length} weapons`);
  
  const armor = await getArmor(client);
  console.log(`Found ${armor.length} Armor 2.0 pieces`);
  
  const armorMods = await getArmorMods(client);
  console.log(`Found ${armorMods.length} Armor 2.0 mods`);
  
  const subclassData = await getSubclassItems(client);
  console.log(`Found ${subclassData.subclasses.length} subclasses`);
  console.log(`Found ${subclassData.aspects.length} aspects`);
  console.log(`Found ${subclassData.fragments.length} fragments`);
  console.log(`Found ${subclassData.abilities.length} abilities`);
  
  const damageTypes = await getDamageTypes(client);
  console.log(`Found ${damageTypes.length} damage types`);
  
  const artifactMods = await getArtifactMods(client);
  console.log(`Found ${artifactMods.length} artifact mods`);
  
  const championMods = await getChampionMods(client);
  console.log(`Found ${championMods.length} champion mods`);
  
  // Enrich all items with comprehensive data (stats, perks, damage types)
  console.log('\nEnriching items with comprehensive definitions...');
  const enrichedWeapons = await enrichItems(weapons, client);
  const enrichedArmor = await enrichItems(armor, client);
  const enrichedArmorMods = await enrichItems(armorMods, client);
  const enrichedAspects = await enrichItems(subclassData.aspects, client);
  const enrichedFragments = await enrichItems(subclassData.fragments, client);
  const enrichedAbilities = await enrichItems(subclassData.abilities, client);
  const enrichedArtifactMods = await enrichItems(artifactMods, client);
  const enrichedChampionMods = await enrichItems(championMods, client);
  console.log('Enrichment complete');
  
  // Add enemy weakness reference data
  console.log('\nAdding enemy weakness reference data...');
  const enemyWeaknesses = exportEnemyWeaknessData();
  console.log(`Added ${enemyWeaknesses.length} enemy weakness entries`);
  
  return {
    weapons: enrichedWeapons,
    armor: enrichedArmor,
    armorMods: enrichedArmorMods,
    subclasses: subclassData.subclasses,
    aspects: enrichedAspects,
    fragments: enrichedFragments,
    abilities: enrichedAbilities,
    damageTypes,
    artifactMods: enrichedArtifactMods,
    championMods: enrichedChampionMods,
    enemyWeaknesses
  };
}

/**
 * Clears the cached data
 */
function clearCache() {
  manifestCache = null;
  definitionsCache = {};
}

module.exports = {
  ITEM_CATEGORIES,
  WEAPON_TYPES,
  ARMOR_TYPES,
  SUBCLASS_PLUG_CATEGORIES,
  ARMOR_2_0_PLUG_SET_HASH,
  ARMOR_2_0_STAT_PLUG_CATEGORY,
  ARMOR_2_0_MOD_IDENTIFIERS,
  loadManifest,
  loadDefinitions,
  loadStatDefinitions,
  loadPerkDefinitions,
  loadDamageTypeDefinitions,
  enrichItemWithStats,
  enrichItemWithPerks,
  enrichItemsWithStatNames,
  enrichItems,
  isArmor2_0,
  getWeapons,
  getArmor,
  getArmorMods,
  getSubclassItems,
  getAspects,
  getFragments,
  getDamageTypes,
  getArtifactMods,
  getChampionMods,
  getAllBuildCraftingData,
  clearCache
};
