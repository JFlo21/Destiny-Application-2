/**
 * Loader/validator for the curated mechanics layer under data/curated/.
 *
 * These JSON files hold community knowledge that the Bungie API does not
 * expose directly (subclass verb behavior, stat-tier cooldowns, champion
 * counters, buff stacking rules). Each entry carries a `source` field so
 * exported sheets can distinguish API data from curated data.
 */
const fs = require('fs');
const path = require('path');

const CURATED_DIR = path.join(__dirname, '..', 'data', 'curated');

/**
 * Required fields per curated file, used for validation.
 */
const CURATED_FILES = {
  subclassVerbs: { file: 'subclassVerbs.json', required: ['element', 'verb', 'type', 'description', 'source'] },
  armorStatTiers: { file: 'armorStatTiers.json', required: ['stat', 'tier', 'value', 'note', 'verified', 'source'] },
  championCounters: { file: 'championCounters.json', required: ['championType', 'stunMethod', 'methodType', 'notes', 'source'] },
  stackingRules: { file: 'stackingRules.json', required: ['category', 'examples', 'stacking', 'notes', 'source'] },
};

/**
 * Load and validate a single curated JSON file.
 * @param {string} key - Key in CURATED_FILES
 * @returns {object[]} - Validated entries array
 */
function loadCuratedFile(key) {
  const spec = CURATED_FILES[key];
  if (!spec) {
    throw new Error(`Unknown curated dataset: ${key}`);
  }
  const filePath = path.join(CURATED_DIR, spec.file);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (!Array.isArray(raw.entries)) {
    throw new Error(`Curated file ${spec.file} must have an "entries" array`);
  }

  raw.entries.forEach((entry, index) => {
    for (const field of spec.required) {
      if (entry[field] === undefined || entry[field] === null) {
        throw new Error(`Curated file ${spec.file} entry ${index} is missing required field "${field}"`);
      }
    }
  });

  return raw.entries;
}

/**
 * Load all curated datasets.
 * @returns {{subclassVerbs: object[], armorStatTiers: object[], championCounters: object[], stackingRules: object[]}}
 */
function loadCuratedData() {
  return {
    subclassVerbs: loadCuratedFile('subclassVerbs'),
    armorStatTiers: loadCuratedFile('armorStatTiers'),
    championCounters: loadCuratedFile('championCounters'),
    stackingRules: loadCuratedFile('stackingRules'),
  };
}

/**
 * Get the sorted list of known verb keywords (longest first, so multi-word
 * verbs like "Stasis Crystal" match before "Stasis").
 * @param {object[]} [subclassVerbs] - Optional pre-loaded verb entries
 * @returns {string[]} - Verb names
 */
function getVerbKeywords(subclassVerbs = null) {
  const entries = subclassVerbs || loadCuratedFile('subclassVerbs');
  return entries.map((e) => e.verb).sort((a, b) => b.length - a.length);
}

/**
 * Extra text forms for verbs whose in-game descriptions use irregular
 * conjugations that simple suffix matching cannot catch.
 */
const VERB_ALIASES = {
  Freeze: ['frozen', 'freezing'],
  Ignition: ['ignite', 'ignites', 'ignited', 'igniting'],
  Invisibility: ['invisible'],
  Amplified: ['amplify'],
  Suppress: ['suppression'],
};

/**
 * Keyword-match a description against curated subclass verbs.
 * Word-boundary matching keeps "Slow" from matching "slowly".
 * @param {string} description - Item description text
 * @param {object[]} [subclassVerbs] - Optional pre-loaded verb entries
 * @returns {string[]} - List of matched verbs (deduplicated, in curated order)
 */
function matchVerbsInText(description, subclassVerbs = null) {
  if (!description) return [];
  const verbs = getVerbKeywords(subclassVerbs);
  const matched = [];
  for (const verb of verbs) {
    // Match the verb with optional grammatical suffixes ("jolted", "scorches",
    // "slowing") while rejecting unrelated words like "slowly".
    const escaped = verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Verbs ending in 'e' drop it before -ing/-ed ("freeze" -> "freezing")
    const stem = escaped.endsWith('e') ? escaped.slice(0, -1) : escaped;
    const forms = [`${escaped}(?:s|es|ed|d|ing)?`, `${stem}(?:ing|ed)`];
    for (const alias of VERB_ALIASES[verb] || []) {
      forms.push(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    const pattern = new RegExp(`\\b(?:${forms.join('|')})\\b`, 'i');
    if (pattern.test(description)) {
      matched.push(verb);
    }
  }
  return matched;
}

module.exports = {
  CURATED_FILES,
  loadCuratedFile,
  loadCuratedData,
  getVerbKeywords,
  matchVerbsInText,
};
