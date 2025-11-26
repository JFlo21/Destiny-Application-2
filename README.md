# Destiny-Application-2

A Node.js application that fetches build crafting data from the Bungie API for Destiny 2.

## Features

- Fetches weapon data from the Destiny 2 manifest
- Fetches armor data (helmets, gauntlets, chest, legs, class items)
- Fetches armor mods
- Fetches subclass aspects
- Fetches subclass fragments
- Caches manifest data to minimize API calls

## Installation

```bash
npm install
```

## Configuration

You need to set your Bungie API key as an environment variable:

```bash
export BUNGIE_API_KEY=your_api_key_here
```

You can get an API key from [Bungie's Developer Portal](https://www.bungie.net/en/Application).

## Usage

### Running the Application

```bash
# Set environment variable and run
BUNGIE_API_KEY=your_api_key npm start
```

### Using as a Module

```javascript
const { createBungieClient } = require('./src/bungieClient');
const { getAllBuildCraftingData, getWeapons, getArmor, getArmorMods, getAspects, getFragments } = require('./src/buildCrafting');

async function example() {
  const client = createBungieClient('your-api-key');
  
  // Get all build crafting data at once
  const buildData = await getAllBuildCraftingData(client);
  
  // Or fetch specific categories
  const weapons = await getWeapons(client);
  const armor = await getArmor(client);
  const mods = await getArmorMods(client);
  const aspects = await getAspects(client);
  const fragments = await getFragments(client);
}
```

## Project Structure

```
├── index.js                 # Main entry point
├── src/
│   ├── bungieClient.js      # Bungie API client
│   ├── manifest.js          # Manifest fetching utilities
│   └── buildCrafting.js     # Build crafting data fetching
├── test/
│   └── buildCrafting.test.js # Tests
├── package.json
└── README.md
```

## API Reference

### bungieClient.js

- `createBungieClient(apiKey)` - Creates a new Bungie API client

### buildCrafting.js

- `getWeapons(client)` - Fetches all weapons
- `getArmor(client)` - Fetches all armor pieces
- `getArmorMods(client)` - Fetches all armor mods
- `getAspects(client)` - Fetches all subclass aspects
- `getFragments(client)` - Fetches all subclass fragments
- `getAllBuildCraftingData(client)` - Fetches all build crafting data
- `clearCache()` - Clears the manifest cache

## Running Tests

```bash
# Unit tests (no API key required)
npm test

# Integration tests (API key required)
BUNGIE_API_KEY=your_api_key npm test
```

## Requirements

- Node.js 14 or later (Node.js 18+ recommended)

## License

ISC