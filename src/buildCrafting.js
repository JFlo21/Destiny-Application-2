const { getManifest, downloadManifestComponent, getDefinitionPath } = require('./manifest');
const { exportEnemyWeaknessData } = require('./enemyWeaknesses');

/**
 * Item categories for filtering
 * Reference: https://bungie-net.github.io/multi/schema_Destiny-Definitions-DestinyItemCategoryDefinition.html
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
 * These patterns are used in plugCategoryIdentifier to identify subclass-related items.
 * Reference: https://bungie-net.github.io/multi/schema_Destiny-Definitions-Items-DestinyItemPlugDefinition.html
 * Common patterns include:
 * - Aspects: 'Subclass.Aspects', 'v400.plugs.aspects', etc. (contains 'aspects')
 * - Fragments: 'Subclass.Fragments', 'v400.plugs.fragments', etc. (contains 'fragments')
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
 * Armor mod system related constants
 * Post-Lightfall (2023+), Destiny 2 uses a universal mod system where armor mods
 * are no longer restricted by elemental affinity. All mods can be slotted into any
 * armor piece regardless of energy type. The energy capacity system still exists
 * to limit mod stacking, but elemental affinity restrictions were removed.
 * These constants help identify mod-compatible armor and socket types.
 */
const ARMOR_2_0_PLUG_SET_HASH = 4163334830; // Common armor mod plug set hash
const ARMOR_2_0_STAT_PLUG_CATEGORY = 1744546145; // Stat mod plug category hash

/**
 * Cache for manifest data
 */
let manifestCache = null;
let definitionsCache = {};
let currentSeasonHash = null;
let currentSeasonName = null;
let currentSeasonNumber = null;

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
 * Loads energy type definitions for resolving energy type hashes on armor and mods
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Energy type definitions (DestinyEnergyTypeDefinition)
 */
async function loadEnergyTypeDefinitions(client) {
  return await loadDefinitions(client, 'DestinyEnergyTypeDefinition');
}

/**
 * Loads season definitions
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Season definitions
 */
async function loadSeasonDefinitions(client) {
  return await loadDefinitions(client, 'DestinySeasonDefinition');
}

/**
 * Loads energy type definitions for resolving armor energy types
 * Post-Lightfall, energy types (Arc, Solar, Void, Stasis, Any) still exist on armor
 * but no longer restrict which mods can be slotted.
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Energy type definitions (DestinyEnergyTypeDefinition)
 */
async function loadEnergyTypeDefinitions(client) {
  return await loadDefinitions(client, 'DestinyEnergyTypeDefinition');
}

/**
 * Loads socket type definitions for understanding mod socket categories
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Socket type definitions (DestinySocketTypeDefinition)
 */
async function loadSocketTypeDefinitions(client) {
  return await loadDefinitions(client, 'DestinySocketTypeDefinition');
}

/**
 * Loads socket category definitions for categorizing mod slots
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Socket category definitions (DestinySocketCategoryDefinition)
 */
async function loadSocketCategoryDefinitions(client) {
  return await loadDefinitions(client, 'DestinySocketCategoryDefinition');
}

/**
 * Loads plug set definitions for listing available mods per socket
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Plug set definitions (DestinyPlugSetDefinition)
 */
async function loadPlugSetDefinitions(client) {
  return await loadDefinitions(client, 'DestinyPlugSetDefinition');
}

/**
 * Loads lore definitions for resolving lore text from loreHash
 * Per Bungie API (openapi.json), DestinyLoreDefinition contains displayProperties (name, description)
 * and subtitle fields for in-game lore narratives.
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Lore definitions (DestinyLoreDefinition)
 */
async function loadLoreDefinitions(client) {
  return await loadDefinitions(client, 'DestinyLoreDefinition');
}

/**
 * Gets the current season hash by dynamically detecting the active season
 * The current season is determined by finding the season that:
 * 1. Has already started (startDate <= now)
 * 2. Has not ended yet (endDate > now, if available)
 * 3. Has the highest seasonNumber among active seasons
 * @param {object} client - Bungie API client
 * @returns {Promise<number>} - Current season hash
 */
async function getCurrentSeasonHash(client) {
  if (currentSeasonHash !== null) {
    return currentSeasonHash;
  }
  
  const seasonDefs = await loadSeasonDefinitions(client);
  const seasons = Object.values(seasonDefs);
  
  // Get current date for comparison
  const now = new Date();
  
  // Filter to only currently active seasons (started but not ended)
  const activeSeasons = seasons.filter(s => {
    // Season must have a valid seasonNumber
    if (!s.seasonNumber || s.seasonNumber <= 0) return false;
    
    // Check if season has started (if startDate is available)
    if (s.startDate) {
      const startDate = new Date(s.startDate);
      if (startDate > now) return false; // Season hasn't started yet
    }
    
    // Check if season has ended (if endDate is available)
    if (s.endDate) {
      const endDate = new Date(s.endDate);
      if (endDate <= now) return false; // Season has already ended
    }
    
    return true;
  });
  
  // If we found active seasons, use the one with highest season number
  // Otherwise, fall back to the most recent season by seasonNumber
  let currentSeason;
  if (activeSeasons.length > 0) {
    activeSeasons.sort((a, b) => b.seasonNumber - a.seasonNumber);
    currentSeason = activeSeasons[0];
  } else {
    // Fallback: use the season with the highest seasonNumber that has started
    const startedSeasons = seasons.filter(s => {
      if (!s.seasonNumber || s.seasonNumber <= 0) return false;
      if (s.startDate) {
        const startDate = new Date(s.startDate);
        if (startDate > now) return false;
      }
      return true;
    });
    startedSeasons.sort((a, b) => b.seasonNumber - a.seasonNumber);
    currentSeason = startedSeasons[0];
  }
  
  if (!currentSeason) {
    throw new Error('Could not determine current season from manifest');
  }
  
  currentSeasonHash = currentSeason.hash;
  currentSeasonNumber = currentSeason.seasonNumber;
  currentSeasonName = currentSeason.displayProperties?.name || `Season ${currentSeasonNumber}`;
  console.log(`Current season detected: ${currentSeasonName} (Season ${currentSeasonNumber}, hash: ${currentSeasonHash})`);
  
  return currentSeasonHash;
}

/**
 * Gets the current season number
 * @param {object} client - Bungie API client
 * @returns {Promise<number>} - Current season number
 */
async function getCurrentSeasonNumber(client) {
  // Ensure season data is loaded
  await getCurrentSeasonHash(client);
  return currentSeasonNumber;
}

/**
 * Gets the current season name
 * @param {object} client - Bungie API client
 * @returns {Promise<string>} - Current season name
 */
async function getCurrentSeasonName(client) {
  // Ensure season data is loaded
  await getCurrentSeasonHash(client);
  return currentSeasonName || `Season ${currentSeasonNumber}`;
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
  // Use defaultDamageTypeHash (the actual hash) to look up in damageTypeDefs,
  // not defaultDamageType which is an enum value (1=Kinetic, 2=Arc, etc.)
  let enrichedDamageType = null;
  if (item.defaultDamageTypeHash && damageTypeDefs) {
    const damageTypeDef = damageTypeDefs[item.defaultDamageTypeHash];
    if (damageTypeDef) {
      enrichedDamageType = {
        hash: item.defaultDamageTypeHash,
        name: damageTypeDef.displayProperties?.name || `Unknown_${item.defaultDamageTypeHash}`,
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
 * Enrich item with resolved intrinsic perk information
 * The intrinsic perk (first socket) defines the weapon's frame/archetype
 * @param {object} item - Item to enrich
 * @param {object} itemDefs - DestinyInventoryItemDefinition lookup table
 * @returns {object} - Item with enrichedIntrinsicPerk
 */
function enrichItemWithIntrinsicPerk(item, itemDefs) {
  if (!item.sockets?.socketEntries?.length) return item;
  
  const intrinsicSocket = item.sockets.socketEntries[0];
  if (!intrinsicSocket?.singleInitialItemHash) return item;
  
  const intrinsicItem = itemDefs[intrinsicSocket.singleInitialItemHash];
  if (!intrinsicItem) return item;
  
  return {
    ...item,
    enrichedIntrinsicPerk: {
      hash: intrinsicSocket.singleInitialItemHash,
      name: intrinsicItem.displayProperties?.name || '',
      description: intrinsicItem.displayProperties?.description || ''
    }
  };
}

/**
 * Enrich item with resolved energy type information
 * Post-Lightfall, armor energy types still exist but no longer restrict mod compatibility.
 * This resolves energy type hashes to readable names using DestinyEnergyTypeDefinition.
 * 
 * Per Bungie API (openapi.json), energy type hashes can appear in two locations:
 * - Armor: item.energy.energyTypeHash (DestinyItemInstanceEnergy)
 * - Mods/Plugs: item.plug.energyCost.energyTypeHash (DestinyEnergyCostEntry)
 * This function checks both paths so that both armor and mod items get resolved names.
 * 
 * @param {object} item - Item to enrich
 * @param {object} energyTypeDefs - Energy type definitions (DestinyEnergyTypeDefinition)
 * @returns {object} - Item with enrichedEnergyType
 */
function enrichItemWithEnergyType(item, energyTypeDefs) {
  if (!energyTypeDefs) return item;
  
  // Resolve energy type hash from either armor energy block or plug energy cost
  // Use nullish coalescing (??) to correctly handle energyTypeHash value of 0
  const energyTypeHash = item.energy?.energyTypeHash ?? item.plug?.energyCost?.energyTypeHash;
  if (energyTypeHash == null) return item;
  
  const energyTypeDef = energyTypeDefs[energyTypeHash];
  if (!energyTypeDef) return item;
  
  // Track which source the energy type came from for clarity
  const source = (item.energy?.energyTypeHash != null) ? 'armorEnergy' : 'modEnergyCost';
  
  return {
    ...item,
    enrichedEnergyType: {
      hash: energyTypeHash,
      name: energyTypeDef.displayProperties?.name || '',
      description: energyTypeDef.displayProperties?.description || '',
      enumValue: energyTypeDef.enumValue,
      capacityStatHash: energyTypeDef.capacityStatHash,
      costStatHash: energyTypeDef.costStatHash,
      source
    }
  };
}

/**
 * Enrich item with resolved lore text from DestinyLoreDefinition
 * Per Bungie API (openapi.json), items with a loreHash reference a DestinyLoreDefinition
 * containing displayProperties (name, description) and a subtitle.
 * @param {object} item - Item to enrich
 * @param {object} loreDefs - Lore definitions (DestinyLoreDefinition)
 * @returns {object} - Item with enrichedLore
 */
function enrichItemWithLore(item, loreDefs) {
  if (!item.loreHash || !loreDefs) return item;
  
  const loreDef = loreDefs[item.loreHash];
  if (!loreDef) return item;
  
  return {
    ...item,
    enrichedLore: {
      hash: item.loreHash,
      name: loreDef.displayProperties?.name || '',
      description: loreDef.displayProperties?.description || '',
      subtitle: loreDef.subtitle || ''
    }
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
 * Enrich items with comprehensive data (stats, perks, damage types, intrinsic perks, energy types)
 * @param {object[]} items - Items to enrich
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Fully enriched items
 */
async function enrichItems(items, client) {
  console.log('Loading definitions for enrichment...');
  const statDefs = await loadStatDefinitions(client);
  const perkDefs = await loadPerkDefinitions(client);
  const damageTypeDefs = await loadDamageTypeDefinitions(client);
  const itemDefs = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  const energyTypeDefs = await loadEnergyTypeDefinitions(client);
  
  return items.map(item => {
    let enriched = enrichItemWithStats(item, statDefs);
    enriched = enrichItemWithPerks(enriched, perkDefs, damageTypeDefs);
    enriched = enrichItemWithIntrinsicPerk(enriched, itemDefs);
    enriched = enrichItemWithEnergyType(enriched, energyTypeDefs);
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
 * Filters out redacted (hidden/unreleased) and non-equippable items
 * This ensures only current, usable items are included in build crafting data
 * @param {object[]} items - Items to filter
 * @param {boolean} allowNonEquippable - If true, allows items where equippable is false (for plugs/mods)
 * @returns {object[]} - Filtered items that are not redacted and are equippable (unless allowNonEquippable is true)
 */
function filterUsableItems(items, allowNonEquippable = false) {
  return items.filter(item => {
    // Exclude redacted items (hidden/unreleased content)
    if (item.redacted === true) {
      return false;
    }
    
    // Exclude items that cannot be equipped
    // Some items are in the API but aren't meant to be used by players
    // Skip this check if allowNonEquippable is true (for plugs like mods, aspects, fragments)
    if (!allowNonEquippable && item.equippable === false) {
      return false;
    }
    
    // Exclude items without a name (likely placeholders or incomplete data)
    if (!item.displayProperties?.name) {
      return false;
    }
    
    return true;
  });
}

/**
 * Filters items to only include current season
 * Only returns items that have the exact seasonHash matching the current active season
 * Items without a seasonHash or with a different season will be excluded
 * @param {object[]} items - Items to filter
 * @param {number} seasonHash - Season hash to filter by
 * @returns {object[]} - Filtered items from current season only
 */
function filterByCurrentSeason(items, seasonHash) {
  return items.filter(item => {
    // Items must have a truthy seasonHash AND it must match the current season (strict equality)
    // This explicitly excludes:
    // - Items with no seasonHash property (undefined)
    // - Items with null seasonHash
    // - Items with 0 seasonHash
    // - Items from different seasons
    return item.seasonHash && item.seasonHash === seasonHash;
  });
}

/**
 * Gets all weapons from the manifest
 * Filters out redacted and non-equippable items to ensure only current, usable weapons
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of weapon definitions
 */
async function getWeapons(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  const allWeapons = filterByCategory(items, ITEM_CATEGORIES.WEAPON);
  
  // Filter to only usable items (not redacted, equippable, with names)
  const usableWeapons = filterUsableItems(allWeapons);
  
  return usableWeapons;
}

/**
 * Check if an armor item uses the modern armor system (has energy capacity and mod slots)
 * Post-Lightfall (2023+), all current armor uses this system with universal mod slots.
 * Energy types still exist on armor but no longer restrict which mods can be equipped.
 * @param {object} item - Armor item to check
 * @returns {boolean} - True if item uses the modern armor system
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
 * Gets all armor from the manifest
 * Filters out redacted items and non-equippable items to ensure only current, usable armor
 * Note: Post-Lightfall (2023+), all armor uses universal mod slots with no elemental affinity
 * restrictions. Energy capacity still limits mod stacking but energy type no longer restricts
 * which mods can be slotted. The Armor Charge system replaced Charged with Light and
 * Elemental Wells mechanics.
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of armor definitions
 */
async function getArmor(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  const allArmor = filterByCategory(items, ITEM_CATEGORIES.ARMOR);
  
  // Note: Post-Lightfall, all armor uses universal mod slots (legacy armor was sunset)
  // The isArmor2_0 filter is no longer needed as all current armor is modern
  
  // Filter to only usable items (not redacted, equippable, with names)
  const usableArmor = filterUsableItems(allArmor);
  
  return usableArmor;
}

/**
 * Armor mod identifier patterns for the current universal mod system
 * Post-Lightfall, mods use these patterns in plugCategoryIdentifier
 */
const ARMOR_MOD_IDENTIFIERS = ['v2', 'enhancements', 'armor_tier'];

/**
 * Gets all armor mods from the manifest
 * Filters out redacted items and non-equippable items to ensure only current, usable mods
 * Note: Post-Lightfall (2023+), all mods use universal slots and are no longer
 * restricted by elemental affinity. The Armor Charge system replaced the older
 * Charged with Light and Elemental Wells mod categories.
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of armor mod definitions
 */
async function getArmorMods(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  const allMods = filterByCategory(items, ITEM_CATEGORIES.ARMOR_MODS);
  
  // Note: Post-Lightfall, all mods use universal slots (legacy mods were sunset)
  // The energy cost filter is no longer needed for affinity-based restrictions
  // We just use filterUsableItems to get current, usable mods
  
  // Filter to only usable items (not redacted, with names)
  // Allow non-equippable items since armor mods are plugs and may not be marked as equippable
  const usableMods = filterUsableItems(allMods, true);
  
  return usableMods;
}

/**
 * Gets subclass-related items (aspects, fragments, abilities)
 * Includes all subclass types: Arc, Solar, Void, Stasis, Strand, and Prismatic.
 * Prismatic (added in The Final Shape) combines abilities from all Light and Darkness
 * elements into one subclass, with a unique Transcendence mechanic.
 * Filters out redacted and non-equippable items
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Object containing aspects, fragments, and abilities
 */
async function getSubclassItems(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  
  // Get all subclass items by category hash (1403)
  const subclassItems = filterByCategory(items, ITEM_CATEGORIES.SUBCLASS);
  
  // Per Bungie API (https://github.com/Bungie-net/api), aspects use plugCategoryIdentifier patterns like:
  // - 'Subclass.Aspects' or 'v400.plugs.aspects' or similar containing 'aspect'
  // - Prismatic aspects may use 'prismatic' patterns
  // Reference: https://bungie-net.github.io/multi/schema_Destiny-Definitions-Items-DestinyItemPlugDefinition.html
  const aspects = Object.values(items).filter(item => {
    const plugCat = item.plug?.plugCategoryIdentifier?.toLowerCase() || '';
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    
    // Match aspects by plugCategoryIdentifier containing 'aspect' (covers both singular and plural patterns)
    // Also match by itemTypeDisplayName being exactly 'aspect'
    // Do NOT match by item name as this can capture unrelated items like weapons with "aspect" in their name
    return plugCat.includes('aspect') || itemType === 'aspect';
  });
  
  // Per Bungie API, fragments use plugCategoryIdentifier patterns like:
  // - 'Subclass.Fragments' or 'v400.plugs.fragments' or similar containing 'fragment'
  const fragments = Object.values(items).filter(item => {
    const plugCat = item.plug?.plugCategoryIdentifier?.toLowerCase() || '';
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    
    // Match fragments by plugCategoryIdentifier containing 'fragment' (covers both singular and plural patterns)
    // Also match by itemTypeDisplayName being exactly 'fragment'
    // Do NOT match by item name as this can capture unrelated items like weapons with "fragment" in their name
    return plugCat.includes('fragment') || itemType === 'fragment';
  });
  
  // Get subclass abilities (grenades, melees, class abilities, supers)
  // Per Bungie API, abilities use plugCategoryIdentifier patterns like 'v400.plugs.abilities', 'grenades', etc.
  // Also captures Prismatic-specific ability variants
  const abilities = Object.values(items).filter(item => {
    const plugCat = item.plug?.plugCategoryIdentifier?.toLowerCase() || '';
    
    // Match common subclass ability identifiers per Bungie API patterns
    return plugCat.includes('grenades') ||
           plugCat.includes('melee') ||
           plugCat.includes('class_abilities') ||
           plugCat.includes('super') ||
           plugCat.includes('v400.plugs.abilities');
  });
  
  // Filter all subclass items to only include usable items
  // Note: Subclass aspects, fragments, and abilities persist across seasons.
  // Unlike seasonal artifact mods which change each season, these subclass items
  // remain available to players indefinitely once unlocked, so we export all of them.
  // This includes Prismatic subclass items which combine Light and Darkness elements.
  // Aspects, fragments, and abilities are plugs and may not be marked as equippable
  return {
    subclasses: filterUsableItems(subclassItems),
    aspects: filterUsableItems(aspects, true),
    fragments: filterUsableItems(fragments, true),
    abilities: filterUsableItems(abilities, true)
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
 * Per Bungie API documentation (https://github.com/Bungie-net/api), artifact mods
 * have specific plugCategoryIdentifier patterns like 'seasonal_artifact_perk' or 'artifact_perk'
 * Filters out redacted and non-equippable items
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of artifact mod definitions
 */
async function getArtifactMods(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  
  // Per Bungie API, artifact mods have plugCategoryIdentifier patterns like:
  // - 'seasonal_artifact_perk' or 'seasonal_artifact'
  // - 'artifact_perk' or 'artifact_perk_episodeX' (where X is the episode/season number)
  // Reference: https://bungie-net.github.io/multi/schema_Destiny-Definitions-Items-DestinyItemPlugDefinition.html
  const allArtifactMods = Object.values(items).filter(item => {
    if (!item.plug) return false;
    if (!item.displayProperties?.name) return false; // Filter out unnamed items
    
    const plugCat = item.plug.plugCategoryIdentifier?.toLowerCase() || '';
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    
    // Match artifact mods based on Bungie API patterns
    // These identifiers are used for seasonal artifact perks/mods
    return plugCat.includes('seasonal_artifact') || 
           plugCat.includes('artifact_perk') ||
           plugCat.startsWith('artifact') ||
           itemType.includes('artifact');
  });
  
  // Filter to only usable items (not redacted, with names)
  // Allow non-equippable items since artifact mods are plugs and may not be marked as equippable
  return filterUsableItems(allArtifactMods, true);
}

/**
 * Gets champion mods (anti-barrier, overload, unstoppable)
 * Filters out redacted and non-equippable items
 * Note: Includes all champion mods without strict season filtering, as the Bungie API
 * may not consistently set seasonHash on all champion mods
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of champion mod definitions
 */
async function getChampionMods(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  
  const allChampionMods = Object.values(items).filter(item => {
    if (!item.plug) return false;
    if (!item.itemCategoryHashes || !item.itemCategoryHashes.includes(ITEM_CATEGORIES.ARMOR_MODS)) {
      return false;
    }
    
    const name = item.displayProperties?.name?.toLowerCase() || '';
    const description = item.displayProperties?.description?.toLowerCase() || '';
    
    // Champion mods have specific prefixes or terms in name or description
    // Use more specific patterns to avoid false positives
    const championPatterns = [
      'anti-barrier',
      'overload',
      'unstoppable',
      'pierce barrier',
      'disrupt overload',
      'stagger unstoppable'
    ];
    
    return championPatterns.some(pattern => 
      name.includes(pattern) || description.includes(pattern)
    );
  });
  
  // Filter to only usable items (not redacted, with names)
  // Allow non-equippable items since champion mods are plugs and may not be marked as equippable
  // Note: Season filtering removed as it was too restrictive
  return filterUsableItems(allChampionMods, true);
}

/**
 * Gets all build crafting related data
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Object containing all build crafting data
 */
async function getAllBuildCraftingData(client) {
  // Get season name for logging
  const seasonName = await getCurrentSeasonName(client);
  
  console.log(`\n=== Fetching Build Crafting Data ===\n`);
  
  const weapons = await getWeapons(client);
  console.log(`Found ${weapons.length} weapons`);
  
  const armor = await getArmor(client);
  console.log(`Found ${armor.length} armor pieces`);
  
  const armorMods = await getArmorMods(client);
  console.log(`Found ${armorMods.length} armor mods`);
  
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
  
  console.log(`\n=== Data Fetch Complete ===`);
  
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
  currentSeasonHash = null;
  currentSeasonName = null;
  currentSeasonNumber = null;
}

module.exports = {
  ITEM_CATEGORIES,
  WEAPON_TYPES,
  ARMOR_TYPES,
  SUBCLASS_PLUG_CATEGORIES,
  ARMOR_2_0_PLUG_SET_HASH,
  ARMOR_2_0_STAT_PLUG_CATEGORY,
  ARMOR_MOD_IDENTIFIERS,
  loadManifest,
  loadDefinitions,
  loadStatDefinitions,
  loadPerkDefinitions,
  loadDamageTypeDefinitions,
  loadEnergyTypeDefinitions,
  loadSeasonDefinitions,
  loadEnergyTypeDefinitions,
  loadSocketTypeDefinitions,
  loadSocketCategoryDefinitions,
  loadPlugSetDefinitions,
  loadLoreDefinitions,
  getCurrentSeasonHash,
  getCurrentSeasonNumber,
  getCurrentSeasonName,
  filterByCurrentSeason,
  filterUsableItems,
  enrichItemWithStats,
  enrichItemWithPerks,
  enrichItemWithIntrinsicPerk,
  enrichItemWithEnergyType,
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
