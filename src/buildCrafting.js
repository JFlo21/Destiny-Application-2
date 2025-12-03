const { getManifest, downloadManifestComponent, getDefinitionPath } = require('./manifest');

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
 * Gets all armor from the manifest
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of armor definitions
 */
async function getArmor(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  return filterByCategory(items, ITEM_CATEGORIES.ARMOR);
}

/**
 * Gets all armor mods from the manifest
 * @param {object} client - Bungie API client
 * @returns {Promise<object[]>} - Array of armor mod definitions
 */
async function getArmorMods(client) {
  const items = await loadDefinitions(client, 'DestinyInventoryItemDefinition');
  return filterByCategory(items, ITEM_CATEGORIES.ARMOR_MODS);
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
  const aspects = Object.values(items).filter(item => {
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    return itemType.includes('aspect') || 
           (item.plug && item.plug.plugCategoryIdentifier?.includes('aspects'));
  });
  
  // Fragments have specific plug category identifiers  
  const fragments = Object.values(items).filter(item => {
    const itemType = item.itemTypeDisplayName?.toLowerCase() || '';
    return itemType.includes('fragment') ||
           (item.plug && item.plug.plugCategoryIdentifier?.includes('fragments'));
  });
  
  return {
    subclasses: subclassItems,
    aspects,
    fragments
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
 * Gets all build crafting related data
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Object containing all build crafting data
 */
async function getAllBuildCraftingData(client) {
  console.log('\n=== Fetching Build Crafting Data ===\n');
  
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
  
  return {
    weapons,
    armor,
    armorMods,
    subclasses: subclassData.subclasses,
    aspects: subclassData.aspects,
    fragments: subclassData.fragments
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
  loadManifest,
  loadDefinitions,
  getWeapons,
  getArmor,
  getArmorMods,
  getSubclassItems,
  getAspects,
  getFragments,
  getAllBuildCraftingData,
  clearCache
};
