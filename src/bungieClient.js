/**
 * Bungie API HTTP client.
 *
 * Features:
 * - Uses native fetch when available (Node >= 18), falls back to node-fetch.
 * - Request timeout via AbortController.
 * - Retry with exponential backoff (3 attempts), honoring Bungie's
 *   ThrottleSeconds hint when the API asks us to slow down.
 */

// Prefer the platform fetch (Node >= 18); fall back to node-fetch for older runtimes
const fetchImpl = typeof globalThis.fetch === 'function'
  ? globalThis.fetch.bind(globalThis)
  : require('node-fetch');
const AbortControllerImpl = typeof globalThis.AbortController === 'function'
  ? globalThis.AbortController
  : require('abort-controller');

const BUNGIE_API_BASE_URL = 'https://www.bungie.net/Platform';

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;

/**
 * Sleep helper for backoff delays
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL with a hard timeout using AbortController.
 * @param {string} url - URL to fetch
 * @param {object} init - fetch init options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortControllerImpl();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch with retry + exponential backoff. Retries on network errors, 5xx,
 * and 429 responses. Honors Bungie's ThrottleSeconds when present in the body.
 * @param {string} url - URL to fetch
 * @param {object} init - fetch init options
 * @param {object} [opts] - { timeoutMs, maxAttempts }
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, init = {}, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);

      // Retry on server errors and rate limiting
      if (response.status >= 500 || response.status === 429) {
        lastError = new Error(`Bungie API error: ${response.status} ${response.statusText}`);
        if (attempt < maxAttempts) {
          let waitMs = BASE_BACKOFF_MS * 2 ** (attempt - 1);
          // Honor Bungie's ThrottleSeconds hint if the body carries one
          try {
            const body = await response.clone().json();
            if (body?.ThrottleSeconds > 0) {
              waitMs = Math.max(waitMs, body.ThrottleSeconds * 1000);
            }
          } catch {
            // Non-JSON body; use default backoff
          }
          await sleep(waitMs);
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
        continue;
      }
    }
  }
  throw lastError;
}

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

    const response = await fetchWithRetry(url, { headers });

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

module.exports = { createBungieClient, BUNGIE_API_BASE_URL, fetchWithRetry, fetchWithTimeout };
