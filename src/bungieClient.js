const fetch = require('node-fetch');

const BUNGIE_API_BASE_URL = 'https://www.bungie.net/Platform';

/**
 * Creates a Bungie API client with the provided API key
 * @param {string} apiKey - The Bungie API key
 * @returns {object} - API client with methods for fetching data
 */
function createBungieClient(apiKey) {
  if (!apiKey) {
    throw new Error('Bungie API key is required');
  }

  const headers = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  };

  /**
   * Makes a request to the Bungie API
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<object>} - API response data
   */
  async function request(endpoint) {
    const url = `${BUNGIE_API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Bungie API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.ErrorCode !== 1) {
      throw new Error(`Bungie API error: ${data.Message}`);
    }
    
    return data.Response;
  }

  return {
    request,
    headers
  };
}

module.exports = { createBungieClient, BUNGIE_API_BASE_URL };
