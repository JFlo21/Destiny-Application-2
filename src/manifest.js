const fetch = require('node-fetch');

const BUNGIE_MANIFEST_URL = 'https://www.bungie.net/Platform/Destiny2/Manifest/';
const BUNGIE_BASE_URL = 'https://www.bungie.net';

/**
 * Fetches the Destiny 2 manifest containing all game definitions
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Manifest data
 */
async function getManifest(client) {
  return await client.request('/Destiny2/Manifest/');
}

/**
 * Downloads a specific manifest component (JSON database)
 * @param {string} componentPath - Path to the manifest component
 * @returns {Promise<object>} - Component data
 */
async function downloadManifestComponent(componentPath) {
  const url = `${BUNGIE_BASE_URL}${componentPath}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download manifest component: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Gets the path to a specific definition table from the manifest
 * @param {object} manifest - The manifest data
 * @param {string} tableName - Name of the definition table
 * @param {string} locale - Locale (default: 'en')
 * @returns {string} - Path to the definition table
 */
function getDefinitionPath(manifest, tableName, locale = 'en') {
  const jsonWorldComponentPaths = manifest.jsonWorldComponentContentPaths;
  
  if (!jsonWorldComponentPaths || !jsonWorldComponentPaths[locale]) {
    throw new Error(`Locale '${locale}' not found in manifest`);
  }
  
  const path = jsonWorldComponentPaths[locale][tableName];
  
  if (!path) {
    throw new Error(`Definition table '${tableName}' not found in manifest`);
  }
  
  return path;
}

module.exports = {
  getManifest,
  downloadManifestComponent,
  getDefinitionPath
};
