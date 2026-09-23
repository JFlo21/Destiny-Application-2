/**
 * Shared Destiny 2 constants used across the build-crafting pipeline.
 * Centralized here to remove duplication between buildCrafting.js and csvExport.js.
 *
 * All hashes reference Bungie's manifest definitions:
 * https://bungie-net.github.io/multi/index.html
 */

/**
 * Item categories for filtering (DestinyItemCategoryDefinition hashes)
 */
const ITEM_CATEGORIES = {
  WEAPON: 1,
  ARMOR: 20,
  ARMOR_MODS: 59,
  GHOST: 39,
  SUBCLASS: 1403,
};

/**
 * Item subtypes for weapons (DestinyItemSubType enum)
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
  GLAIVE: 27,
};

/**
 * Armor types (DestinyItemSubType enum)
 */
const ARMOR_TYPES = {
  HELMET: 26,
  GAUNTLETS: 27,
  CHEST: 28,
  LEGS: 29,
  CLASS_ITEM: 30,
};

/**
 * Class type enum to readable name (DestinyClass enum)
 */
const CLASS_TYPES = {
  0: 'Titan',
  1: 'Hunter',
  2: 'Warlock',
  3: 'Any',
};

/**
 * Subclass plug category identifier keywords
 */
const SUBCLASS_PLUG_CATEGORIES = {
  ASPECTS: 'aspects',
  FRAGMENTS: 'fragments',
  SUPER: 'super',
  GRENADE: 'grenade',
  MELEE: 'melee',
  CLASS_ABILITY: 'class_ability',
};

/**
 * Armor 2.0 (universal mod system) constants.
 * Post-Lightfall, armor mods use universal slots; energy capacity still limits stacking.
 */
const ARMOR_2_0_PLUG_SET_HASH = 4163334830; // Common armor mod plug set hash
const ARMOR_2_0_STAT_PLUG_CATEGORY = 1744546145; // Stat mod plug category hash

/**
 * Armor mod identifier patterns for the current universal mod system
 */
const ARMOR_MOD_IDENTIFIERS = ['v2', 'enhancements', 'armor_tier'];

/**
 * Socket category hashes (DestinySocketCategoryDefinition).
 * INTRINSIC_TRAITS holds the weapon frame / exotic armor intrinsic socket.
 * WEAPON_PERKS holds the randomized/curated trait columns of a weapon.
 */
const SOCKET_CATEGORY_HASHES = {
  INTRINSIC_TRAITS: 3956125808,
  WEAPON_PERKS: 4241085061,
  ARMOR_MODS: 590099826,
};

/**
 * Weapon slot bucket hashes (DestinyInventoryBucketDefinition)
 */
const WEAPON_SLOT_BUCKETS = {
  1498876634: 'Kinetic',
  2465295065: 'Energy',
  953998645: 'Power',
};

/**
 * Well-known stat hashes (DestinyStatDefinition) — fallback name mapping
 */
const STAT_HASHES = {
  // Armor stats (classic names)
  2996146975: 'Mobility',
  392767087: 'Resilience',
  1943323491: 'Recovery',
  1735777505: 'Discipline',
  144602215: 'Intellect',
  4244567218: 'Strength',

  // Weapon stats
  4284893193: 'RPM (Rounds Per Minute)',
  4043523819: 'Impact',
  1240592695: 'Range',
  155624089: 'Stability',
  943549884: 'Handling',
  4188031367: 'Reload Speed',
  1345609583: 'Aim Assistance',
  2715839340: 'Recoil Direction',
  3555269338: 'Zoom',
  3871231066: 'Magazine',
  2961396640: 'Charge Time',
  447667954: 'Draw Time',
  925767036: 'Ammo Capacity',
  1931675084: 'Inventory Size',
  3614673599: 'Blast Radius',
  2523465841: 'Velocity',
  1591432999: 'Accuracy',
  3597844532: 'Shield Duration',
  1546607977: 'Guard Resistance',
  209426660: 'Guard Efficiency',
  3022301683: 'Guard Endurance',
  2837207746: 'Swing Speed',
  1486958981: 'Charge Rate',
  2714457168: 'Airborne Effectiveness',
};

/**
 * "Fragment Slots" investment stat hash carried on subclass aspects.
 * The value of this stat is how many fragment sockets the aspect grants.
 */
const FRAGMENT_SLOTS_STAT_HASH = 2223994109;

/**
 * Canonical ordering for weapon stat columns in exports.
 * Stats not in this list are appended alphabetically after these.
 */
const CANONICAL_WEAPON_STAT_ORDER = [
  'Impact',
  'Range',
  'Stability',
  'Handling',
  'Reload Speed',
  'RPM (Rounds Per Minute)',
  'Rounds Per Minute',
  'RPM',
  'Aim Assistance',
  'Zoom',
  'Recoil Direction',
  'Magazine',
  'Charge Time',
  'Draw Time',
  'Blast Radius',
  'Velocity',
  'Accuracy',
  'Swing Speed',
  'Guard Efficiency',
  'Guard Resistance',
  'Guard Endurance',
  'Charge Rate',
  'Ammo Capacity',
  'Airborne Effectiveness',
];

/**
 * Canonical ordering for armor stat columns.
 * Includes both classic stat names and the newer "Armor 3.0" names
 * (Weapons/Health/Class/Grenade/Super/Melee) if present in DestinyStatDefinition.
 */
const CANONICAL_ARMOR_STAT_ORDER = [
  'Mobility',
  'Resilience',
  'Recovery',
  'Discipline',
  'Intellect',
  'Strength',
  'Weapons',
  'Health',
  'Class',
  'Grenade',
  'Super',
  'Melee',
];

/**
 * Ammo type enum names (Destiny.DestinyAmmunitionType)
 */
const AMMO_TYPES = {
  0: 'None',
  1: 'Primary',
  2: 'Special',
  3: 'Heavy',
  4: 'Unknown',
};

/**
 * Energy type enum names (Destiny.DestinyEnergyType) — fallback mapping.
 * API identifier "Thermal" maps to in-game "Solar".
 */
const ENERGY_TYPE_NAMES = {
  0: 'Any',
  1: 'Arc',
  2: 'Solar',
  3: 'Void',
  4: 'Ghost',
  5: 'Subclass',
  6: 'Stasis',
};

/**
 * Breaker type enum names (Destiny.DestinyBreakerType)
 */
const BREAKER_TYPES = {
  0: 'None',
  1: 'Shield-Piercing (Anti-Barrier)',
  2: 'Disruption (Overload)',
  3: 'Stagger (Unstoppable)',
};

/**
 * Damage type enum names (Destiny.DamageType)
 */
const DAMAGE_TYPE_NAMES = {
  0: 'None',
  1: 'Kinetic',
  2: 'Arc',
  3: 'Solar',
  4: 'Void',
  5: 'Raid',
  6: 'Stasis',
  7: 'Strand',
};

/**
 * Element color palette (ARGB hex without alpha) matching in-game element hues.
 * Used for tab colors, cell fills, and the Fragment Matrix.
 */
const ELEMENT_COLORS = {
  Arc: '7AECF3',
  Solar: 'F2721B',
  Void: 'B184C5',
  Stasis: '4D88FF',
  Strand: '35E366',
  Prismatic: 'F871FF',
  Kinetic: 'D9D9D9',
};

/**
 * Rarity (tier type) color palette.
 */
const RARITY_COLORS = {
  Exotic: 'CEAE33',
  Legendary: '522F65',
  Rare: '5076A3',
  Common: '366F42',
  Basic: 'C3BCB4',
};

module.exports = {
  ITEM_CATEGORIES,
  WEAPON_TYPES,
  ARMOR_TYPES,
  CLASS_TYPES,
  SUBCLASS_PLUG_CATEGORIES,
  ARMOR_2_0_PLUG_SET_HASH,
  ARMOR_2_0_STAT_PLUG_CATEGORY,
  ARMOR_MOD_IDENTIFIERS,
  SOCKET_CATEGORY_HASHES,
  WEAPON_SLOT_BUCKETS,
  STAT_HASHES,
  FRAGMENT_SLOTS_STAT_HASH,
  CANONICAL_WEAPON_STAT_ORDER,
  CANONICAL_ARMOR_STAT_ORDER,
  AMMO_TYPES,
  ENERGY_TYPE_NAMES,
  BREAKER_TYPES,
  DAMAGE_TYPE_NAMES,
  ELEMENT_COLORS,
  RARITY_COLORS,
};
