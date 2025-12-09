/**
 * Enemy Weakness Reference Data
 * 
 * This module provides reference information about enemy types and their weaknesses
 * to elemental damage in Destiny 2. While the Bungie API doesn't expose a direct
 * enemy definition table, this data is well-documented by the community and can be
 * used alongside weapon damage type data for build crafting.
 * 
 * Note: This data is regularly updated to reflect current game state.
 * Last updated for current Destiny 2 content.
 */

/**
 * Damage type enum values
 */
const DAMAGE_TYPES = {
  NONE: 0,
  KINETIC: 1,
  ARC: 2,
  SOLAR: 3,
  VOID: 4,
  RAID: 5,
  STASIS: 6,
  STRAND: 7
};

/**
 * Enemy factions in Destiny 2
 */
const ENEMY_FACTIONS = {
  FALLEN: 'Fallen',
  HIVE: 'Hive',
  VEX: 'Vex',
  CABAL: 'Cabal',
  TAKEN: 'Taken',
  SCORN: 'Scorn',
  LUCENT_HIVE: 'Lucent Hive',
  TORMENTORS: 'Tormentors',
  SHADOW_LEGION: 'Shadow Legion'
};

/**
 * Champion types and their counter mods
 */
const CHAMPION_TYPES = {
  BARRIER: {
    name: 'Barrier Champion',
    counter: 'Anti-Barrier',
    description: 'Regenerates health behind an immune shield. Requires Anti-Barrier weapons to break.',
    factions: ['Fallen', 'Cabal', 'Hive', 'Vex', 'Scorn', 'Taken']
  },
  OVERLOAD: {
    name: 'Overload Champion',
    counter: 'Overload',
    description: 'Rapidly regenerates health and teleports. Requires Overload weapons to stun.',
    factions: ['Fallen', 'Vex', 'Hive', 'Taken', 'Scorn']
  },
  UNSTOPPABLE: {
    name: 'Unstoppable Champion',
    counter: 'Unstoppable',
    description: 'Charges aggressively and has high health. Requires Unstoppable weapons to stagger.',
    factions: ['Cabal', 'Hive', 'Scorn', 'Taken']
  }
};

/**
 * Common enemy shield types by faction
 * Note: Shield types can vary by activity and enemy rank
 */
const ENEMY_SHIELDS = {
  FALLEN: {
    common: [
      { enemy: 'Captain', shield: 'Arc', damageType: DAMAGE_TYPES.ARC },
      { enemy: 'Captain (Solar)', shield: 'Solar', damageType: DAMAGE_TYPES.SOLAR },
      { enemy: 'Captain (Void)', shield: 'Void', damageType: DAMAGE_TYPES.VOID },
      { enemy: 'Servitor', shield: 'Void', damageType: DAMAGE_TYPES.VOID }
    ],
    weakness: 'Arc damage is most common, but Captains can have Solar or Void shields depending on variant.'
  },
  HIVE: {
    common: [
      { enemy: 'Wizard', shield: 'Solar', damageType: DAMAGE_TYPES.SOLAR },
      { enemy: 'Knight (Arc)', shield: 'Arc', damageType: DAMAGE_TYPES.ARC },
      { enemy: 'Knight (Void)', shield: 'Void', damageType: DAMAGE_TYPES.VOID }
    ],
    weakness: 'Solar damage for Wizards. Knights vary between Arc and Void.'
  },
  VEX: {
    common: [
      { enemy: 'Minotaur', shield: 'Void', damageType: DAMAGE_TYPES.VOID },
      { enemy: 'Hydra', shield: 'Void', damageType: DAMAGE_TYPES.VOID },
      { enemy: 'Harpy (Solar)', shield: 'Solar', damageType: DAMAGE_TYPES.SOLAR }
    ],
    weakness: 'Void damage for most shielded Vex units.'
  },
  CABAL: {
    common: [
      { enemy: 'Centurion (Solar)', shield: 'Solar', damageType: DAMAGE_TYPES.SOLAR },
      { enemy: 'Centurion (Arc)', shield: 'Arc', damageType: DAMAGE_TYPES.ARC },
      { enemy: 'Colossus', shield: 'Varies', damageType: 'Multiple types' },
      { enemy: 'Phalanx', shield: 'Varies', damageType: 'Multiple types' }
    ],
    weakness: 'Cabal shields vary widely. Solar and Arc are common.'
  },
  TAKEN: {
    common: [
      { enemy: 'Taken Phalanx', shield: 'Void', damageType: DAMAGE_TYPES.VOID },
      { enemy: 'Taken Centurion', shield: 'Solar', damageType: DAMAGE_TYPES.SOLAR },
      { enemy: 'Taken Knight', shield: 'Arc', damageType: DAMAGE_TYPES.ARC },
      { enemy: 'Taken Wizard', shield: 'Solar', damageType: DAMAGE_TYPES.SOLAR },
      { enemy: 'Taken Minotaur', shield: 'Void', damageType: DAMAGE_TYPES.VOID }
    ],
    weakness: 'Taken enemies can have any elemental shield type based on their origin.'
  },
  SCORN: {
    common: [
      { enemy: 'Chieftain (Solar)', shield: 'Solar', damageType: DAMAGE_TYPES.SOLAR },
      { enemy: 'Chieftain (Arc)', shield: 'Arc', damageType: DAMAGE_TYPES.ARC },
      { enemy: 'Chieftain (Void)', shield: 'Void', damageType: DAMAGE_TYPES.VOID },
      { enemy: 'Abomination', shield: 'Varies', damageType: 'Multiple types' }
    ],
    weakness: 'Scorn Chieftains have all three elemental shield variants.'
  },
  LUCENT_HIVE: {
    common: [
      { enemy: 'Lightbearer Knight', shield: 'Varies', damageType: 'Light-based' },
      { enemy: 'Lightbearer Acolyte', shield: 'Varies', damageType: 'Light-based' },
      { enemy: 'Lightbearer Wizard', shield: 'Varies', damageType: 'Light-based' }
    ],
    weakness: 'Lucent Hive use Light-based shields. Finish them to prevent resurrection.'
  },
  SHADOW_LEGION: {
    common: [
      { enemy: 'Shadow Guard', shield: 'Varies', damageType: 'Multiple types' },
      { enemy: 'Tormentor', shield: 'None', damageType: 'None (use Strand or heavy damage)' }
    ],
    weakness: 'Similar to Cabal, with varied shield types. Tormentors have weak points instead of shields.'
  }
};

/**
 * Elemental damage effectiveness multipliers
 */
const DAMAGE_EFFECTIVENESS = {
  MATCHING_SHIELD: {
    multiplier: 2.0,
    description: 'Matching element deals 200% damage to shields and creates elemental explosion'
  },
  NON_MATCHING_SHIELD: {
    multiplier: 1.0,
    description: 'Non-matching element deals 100% damage to shields'
  },
  KINETIC_VS_SHIELD: {
    multiplier: 1.0,
    description: 'Kinetic deals 100% damage to shields (no explosion)'
  },
  NO_SHIELD: {
    multiplier: 1.0,
    description: 'All damage types deal 100% to unshielded enemies'
  }
};

/**
 * Get enemy weakness information
 * @returns {object} - Enemy weakness reference data
 */
function getEnemyWeaknessData() {
  return {
    damageTypes: DAMAGE_TYPES,
    factions: ENEMY_FACTIONS,
    champions: CHAMPION_TYPES,
    shields: ENEMY_SHIELDS,
    effectiveness: DAMAGE_EFFECTIVENESS
  };
}

/**
 * Export enemy weakness data to a structured format
 * @returns {array} - Array of enemy weakness entries for export
 */
function exportEnemyWeaknessData() {
  const entries = [];
  
  // Add faction-specific shield information
  for (const [faction, data] of Object.entries(ENEMY_SHIELDS)) {
    for (const shield of data.common) {
      entries.push({
        faction: faction,
        enemyType: shield.enemy,
        shieldType: shield.shield,
        effectiveDamageType: shield.shield,
        damageTypeEnum: shield.damageType,
        notes: data.weakness
      });
    }
  }
  
  // Add champion information
  for (const [type, data] of Object.entries(CHAMPION_TYPES)) {
    entries.push({
      faction: 'All',
      enemyType: data.name,
      shieldType: 'None',
      effectiveDamageType: data.counter,
      damageTypeEnum: 'N/A',
      notes: data.description
    });
  }
  
  return entries;
}

module.exports = {
  DAMAGE_TYPES,
  ENEMY_FACTIONS,
  CHAMPION_TYPES,
  ENEMY_SHIELDS,
  DAMAGE_EFFECTIVENESS,
  getEnemyWeaknessData,
  exportEnemyWeaknessData
};
