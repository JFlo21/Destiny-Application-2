/**
 * Long-format (normalized) schemas: one row per item-stat, item-perk, or
 * weapon perk-pool entry. These make the workbook pivot/XLOOKUP friendly
 * instead of packing thousands of characters into single cells.
 */
const { col } = require('./shared');
const { SOCKET_CATEGORY_HASHES } = require('../constants');

/**
 * Item_Stats sheet schema: hash, name, category, statName, value, max
 */
const itemStats = {
  key: 'itemStats',
  columns: [
    col('hash', 'Item Hash', 14, { type: 'number', numFmt: '0' }),
    col('name', 'Item Name', 32),
    col('category', 'Category', 14),
    col('statName', 'Stat', 24),
    col('value', 'Value', 10, { type: 'number', numFmt: '0', isStat: true }),
    col('max', 'Max', 10, { type: 'number', numFmt: '0' }),
  ],
};

/**
 * Build long-format stat rows from enriched items.
 * @param {object} buildData - Build crafting data (with enrichedStats on items)
 * @param {string[]} categories - buildData keys to include
 * @returns {object[]} - Long-format rows
 */
function buildItemStatRows(buildData, categories = ['weapons', 'armor', 'fragments', 'abilities']) {
  const rows = [];
  for (const category of categories) {
    for (const item of buildData[category] || []) {
      if (!item.enrichedStats) continue;
      for (const stat of Object.values(item.enrichedStats)) {
        rows.push({
          hash: item.hash,
          name: item.displayProperties?.name || '',
          category,
          statName: stat.name,
          value: stat.value,
          max: stat.displayMaximum ?? stat.maximum ?? 100,
        });
      }
    }
  }
  return rows;
}

/**
 * Item_Perks sheet schema: one row per socket plug on an item.
 */
const itemPerks = {
  key: 'itemPerks',
  columns: [
    col('hash', 'Item Hash', 14, { type: 'number', numFmt: '0' }),
    col('name', 'Item Name', 32),
    col('socketIndex', 'Socket', 8, { type: 'number', numFmt: '0' }),
    col('columnName', 'Column', 16),
    col('perkHash', 'Perk Hash', 14, { type: 'number', numFmt: '0' }),
    col('perkName', 'Perk', 28),
    col('perkDescription', 'Perk Description', 70, { wrap: true }),
    col('isRandomRoll', 'Random Roll', 12, { type: 'boolean' }),
  ],
};

/**
 * Human-readable column label for a weapon perk socket position.
 * @param {number} position - 0-based position within the WEAPON_PERKS category
 * @returns {string}
 */
function perkColumnName(position) {
  const names = ['Barrel/Sight', 'Magazine/Battery', 'Trait 1', 'Trait 2', 'Origin Trait'];
  return names[position] || `Perk ${position + 1}`;
}

/**
 * Build long-format perk rows for weapons: curated (singleInitialItemHash and
 * reusable plug sets) plus randomized perk pools from DestinyPlugSetDefinition.
 * @param {object[]} weapons - Enriched weapon items
 * @param {object} ctx - { itemDefs, plugSetDefs }
 * @returns {object[]} - Long-format perk rows
 */
function buildItemPerkRows(weapons, ctx) {
  const rows = [];
  const itemDefs = ctx.itemDefs || {};
  const plugSetDefs = ctx.plugSetDefs || {};

  for (const weapon of weapons || []) {
    const sockets = weapon.sockets;
    if (!sockets?.socketEntries?.length) continue;

    // Restrict to the WEAPON_PERKS socket category (hash 4241085061) when
    // socketCategories metadata exists; otherwise emit all sockets.
    const perkCategory = sockets.socketCategories?.find(
      (cat) => cat.socketCategoryHash === SOCKET_CATEGORY_HASHES.WEAPON_PERKS
    );
    const socketIndexes = perkCategory?.socketIndexes
      ?? sockets.socketEntries.map((_, i) => i);

    socketIndexes.forEach((socketIndex, position) => {
      const socket = sockets.socketEntries[socketIndex];
      if (!socket) return;
      const columnName = perkColumnName(position);
      const seen = new Set();

      const pushPerk = (perkHash, isRandomRoll) => {
        if (!perkHash || seen.has(perkHash)) return;
        seen.add(perkHash);
        const perkDef = itemDefs[perkHash];
        rows.push({
          hash: weapon.hash,
          name: weapon.displayProperties?.name || '',
          socketIndex,
          columnName,
          perkHash,
          perkName: perkDef?.displayProperties?.name || '',
          perkDescription: perkDef?.displayProperties?.description || '',
          isRandomRoll,
        });
      };

      // Curated default plug
      pushPerk(socket.singleInitialItemHash, false);

      // Reusable (curated) plug set
      const reusableSet = plugSetDefs[socket.reusablePlugSetHash];
      for (const plug of reusableSet?.reusablePlugItems || []) {
        pushPerk(plug.plugItemHash, false);
      }

      // Randomized plug set (the weapon's random-roll perk pool)
      const randomSet = plugSetDefs[socket.randomizedPlugSetHash];
      for (const plug of randomSet?.reusablePlugItems || []) {
        pushPerk(plug.plugItemHash, true);
      }
    });
  }
  return rows;
}

/**
 * Weapon Perk Pools schema: one row per (weapon, column, perk) limited to the
 * WEAPON_PERKS socket category and plug-set derived pools.
 */
const weaponPerkPools = {
  key: 'weaponPerkPools',
  columns: [
    col('weaponHash', 'Weapon Hash', 14, { type: 'number', numFmt: '0' }),
    col('weaponName', 'Weapon', 32),
    col('columnName', 'Column', 16),
    col('perkHash', 'Perk Hash', 14, { type: 'number', numFmt: '0' }),
    col('perkName', 'Perk', 28),
    col('perkDescription', 'Perk Description', 70, { wrap: true }),
    col('isRandomRoll', 'Random Roll', 12, { type: 'boolean' }),
  ],
};

/**
 * Build weapon perk-pool rows from plug sets on WEAPON_PERKS sockets.
 * @param {object[]} weapons - Enriched weapon items
 * @param {object} ctx - { itemDefs, plugSetDefs }
 * @returns {object[]}
 */
function buildWeaponPerkPoolRows(weapons, ctx) {
  const rows = [];
  const itemDefs = ctx.itemDefs || {};
  const plugSetDefs = ctx.plugSetDefs || {};

  for (const weapon of weapons || []) {
    const sockets = weapon.sockets;
    const perkCategory = sockets?.socketCategories?.find(
      (cat) => cat.socketCategoryHash === SOCKET_CATEGORY_HASHES.WEAPON_PERKS
    );
    if (!perkCategory?.socketIndexes?.length) continue;

    perkCategory.socketIndexes.forEach((socketIndex, position) => {
      const socket = sockets.socketEntries?.[socketIndex];
      if (!socket) return;
      const columnName = perkColumnName(position);
      const seen = new Set();

      const pushPerk = (perkHash, isRandomRoll) => {
        if (!perkHash || seen.has(perkHash)) return;
        seen.add(perkHash);
        const perkDef = itemDefs[perkHash];
        rows.push({
          weaponHash: weapon.hash,
          weaponName: weapon.displayProperties?.name || '',
          columnName,
          perkHash,
          perkName: perkDef?.displayProperties?.name || '',
          perkDescription: perkDef?.displayProperties?.description || '',
          isRandomRoll,
        });
      };

      const randomSet = plugSetDefs[socket.randomizedPlugSetHash];
      for (const plug of randomSet?.reusablePlugItems || []) {
        pushPerk(plug.plugItemHash, true);
      }
      const reusableSet = plugSetDefs[socket.reusablePlugSetHash];
      for (const plug of reusableSet?.reusablePlugItems || []) {
        pushPerk(plug.plugItemHash, false);
      }
    });
  }
  return rows;
}

module.exports = {
  itemStats,
  itemPerks,
  weaponPerkPools,
  buildItemStatRows,
  buildItemPerkRows,
  buildWeaponPerkPoolRows,
  perkColumnName,
};
