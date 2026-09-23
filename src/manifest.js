const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./bungieClient');

const BUNGIE_BASE_URL = 'https://www.bungie.net';

/**
 * On-disk cache for manifest component downloads.
 * Components are stored in .cache/<manifestVersion>/<table>.json (gitignored).
 * Disable with setCacheEnabled(false) (CLI: --no-cache).
 */
let cacheEnabled = true;
let cacheRoot = path.join(process.cwd(), '.cache');

/**
 * Enable or disable the on-disk manifest cache
 * @param {boolean} enabled
 */
function setCacheEnabled(enabled) {
  cacheEnabled = Boolean(enabled);
}

/**
 * Override the cache root directory (used by tests)
 * @param {string} dir - Cache directory
 */
function setCacheRoot(dir) {
  cacheRoot = dir;
}

/**
 * Fetches the Destiny 2 manifest containing all game definitions
 * @param {object} client - Bungie API client
 * @returns {Promise<object>} - Manifest data
 */
async function getManifest(client) {
  return await client.request('/Destiny2/Manifest/');
}

/**
 * Sanitize a manifest version string so it is safe to use as a directory name
 * @param {string} version - Manifest version
 * @returns {string} - Filesystem-safe version string
 */
function sanitizeVersion(version) {
  return String(version).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Downloads a specific manifest component (JSON database), with optional disk caching.
 * @param {string} componentPath - Path to the manifest component
 * @param {object} [cacheInfo] - Optional { version, tableName } enabling disk cache
 * @returns {Promise<object>} - Component data
 */
async function downloadManifestComponent(componentPath, cacheInfo = null) {
  // Try disk cache first
  let cacheFile = null;
  if (cacheEnabled && cacheInfo?.version && cacheInfo?.tableName) {
    const dir = path.join(cacheRoot, sanitizeVersion(cacheInfo.version));
    cacheFile = path.join(dir, `${cacheInfo.tableName}.json`);
    if (fs.existsSync(cacheFile)) {
      try {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      } catch {
        // Corrupt cache entry — fall through to re-download
      }
    }
  }

  const url = `${BUNGIE_BASE_URL}${componentPath}`;
  const response = await fetchWithRetry(url, {}, { timeoutMs: 120000 });

  if (!response.ok) {
    throw new Error(`Failed to download manifest component: ${response.status}`);
  }

  const data = await response.json();

  // Write to disk cache
  if (cacheFile) {
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(data));
    } catch (error) {
      console.warn(`Warning: could not write manifest cache: ${error.message}`);
    }
  }

  return data;
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
  getDefinitionPath,
  setCacheEnabled,
  setCacheRoot
};
