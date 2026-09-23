// Minimal fixture buildData resembling enriched manifest items
const statDefs = {
  4043523819: { displayProperties: { name: 'Impact' } },
  1240592695: { displayProperties: { name: 'Range' } },
  2996146975: { displayProperties: { name: 'Mobility' } },
  392767087: { displayProperties: { name: 'Resilience' } },
  1943323491: { displayProperties: { name: 'Recovery' } },
  1735777505: { displayProperties: { name: 'Discipline' } },
  144602215: { displayProperties: { name: 'Intellect' } },
  4244567218: { displayProperties: { name: 'Strength' } },
  2223994109: { displayProperties: { name: 'Fragment Slots' } },
};
const weapon = {
  hash: 1111,
  displayProperties: { name: 'Test Auto Rifle', description: 'A weapon.', icon: '/icon.png' },
  itemTypeDisplayName: 'Auto Rifle',
  inventory: { tierTypeName: 'Legendary', bucketTypeHash: 1498876634 },
  itemCategoryHashes: [1, 5],
  defaultDamageType: 2,
  enrichedDamageType: 'Arc',
  enrichedStats: { 4043523819: { name: 'Impact', value: 21, maximum: 100 }, 1240592695: { name: 'Range', value: 46, maximum: 100 } },
  stats: { stats: { 4043523819: { value: 21 }, 1240592695: { value: 46 } } },
  enrichedIntrinsicPerk: { name: 'Adaptive Frame', description: 'Well rounded.' },
  breakerType: 1,
  equippingBlock: { ammoType: 1 },
  screenshot: '/shot.jpg',
};
const sword = {
  hash: 1112,
  displayProperties: { name: 'Test Sword', description: 'A sword.' },
  itemTypeDisplayName: 'Sword',
  inventory: { tierTypeName: 'Exotic', bucketTypeHash: 953998645 },
  itemCategoryHashes: [1, 54],
  defaultDamageType: 3,
  enrichedDamageType: 'Solar',
  enrichedStats: { 2837207746: { name: 'Swing Speed', value: 40, maximum: 100 } },
};
const armorItem = {
  hash: 2222,
  displayProperties: { name: 'Test Helm', description: 'Head.' },
  itemTypeDisplayName: 'Helmet',
  inventory: { tierTypeName: 'Exotic', bucketTypeHash: 3448274439 },
  itemCategoryHashes: [20, 45],
  classType: 0,
  enrichedIntrinsicPerk: { name: 'Exotic Intrinsic', description: 'Does exotic things.' },
  enrichedStats: { 2996146975: { name: 'Mobility', value: 10, maximum: 42 } },
};
const legArmor = { ...armorItem, hash: 2223, displayProperties: { name: 'Test Boots', description: 'Feet.' }, inventory: { tierTypeName: 'Legendary', bucketTypeHash: 20886954 }, enrichedIntrinsicPerk: null };
const subclass = {
  hash: 3333,
  displayProperties: { name: 'Striker', description: 'Arc titan.' },
  itemTypeDisplayName: 'Titan Subclass',
  inventory: { tierTypeName: 'Common' },
  classType: 0,
  talentGrid: { hudDamageType: 2 },
  defaultDamageType: 2,
  enrichedDamageType: 'Arc',
};
const aspect = {
  hash: 4444,
  displayProperties: { name: 'Knockout', description: 'Critically wounding a combatant amplifies you.' },
  itemTypeDisplayName: 'Titan Aspect',
  inventory: { tierTypeName: 'Common' },
  plug: { plugCategoryIdentifier: 'titan.arc.aspects' },
  investmentStats: [{ statTypeHash: 2223994109, value: 2 }],
};
const fragment = {
  hash: 5555,
  displayProperties: { name: 'Spark of Shock', description: 'Your grenades jolt targets. -10 Discipline.' },
  itemTypeDisplayName: 'Arc Fragment',
  inventory: { tierTypeName: 'Common' },
  plug: { plugCategoryIdentifier: 'shared.arc.fragments' },
  investmentStats: [{ statTypeHash: 1735777505, value: -10 }],
};
const ability = (name, plugCat, desc) => ({
  hash: Math.floor(Math.random() * 1e6) + 10000,
  displayProperties: { name, description: desc },
  itemTypeDisplayName: 'Ability',
  inventory: { tierTypeName: 'Common' },
  plug: { plugCategoryIdentifier: plugCat },
});
const armorMod = {
  hash: 6666,
  displayProperties: { name: 'Grenade Kickstart', description: 'Mod things.' },
  itemTypeDisplayName: 'Helmet Armor Mod',
  inventory: { tierTypeName: 'Common' },
  plug: { plugCategoryIdentifier: 'enhancements.v2_head', energyCost: { energyCost: 3 } },
};
const artifactMod = {
  hash: 7777,
  displayProperties: { name: 'Anti-Barrier Rounds', description: 'Pierce barriers.' },
  itemTypeDisplayName: 'Artifact Mod',
  inventory: { tierTypeName: 'Common' },
  plug: { plugCategoryIdentifier: 'artifact.mod' },
  breakerTypeHash: 485622768,
  isCurrentSeason: true,
};
module.exports = {
  buildData: {
    weapons: [weapon, sword],
    armor: [armorItem, legArmor],
    armorMods: [armorMod],
    subclasses: [subclass],
    aspects: [aspect],
    fragments: [fragment],
    abilities: [
      ability('Fists of Havoc', 'titan.arc.supers', 'Super.'),
      ability('Pulse Grenade', 'shared.arc.grenades', 'Grenade.'),
      ability('Seismic Strike', 'titan.arc.melee', 'Melee.'),
      ability('Towering Barricade', 'titan.arc.class_abilities', 'Barricade.'),
    ],
    artifactMods: [artifactMod],
    championMods: [artifactMod],
    damageTypes: [{ hash: 8881, displayProperties: { name: 'Arc', description: 'Zap.' }, enumValue: 2 }],
    enemyWeaknesses: [{ enemy: 'Barrier Champion', weakness: 'Anti-Barrier', notes: 'Pierce shield' }],
    ctx: {
      statDefs,
      season: { hash: 1, number: 27, name: 'Test Season' },
      manifestVersion: 'v-test',
      itemDefs: {},
      plugSetDefs: {},
    },
  },
  statDefs,
};
