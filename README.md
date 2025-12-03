# Destiny-Application-2

A Node.js application that fetches build crafting data from the Bungie API for Destiny 2.

## Features

- Fetches weapon data from the Destiny 2 manifest with detailed stats
- Fetches **Armor 2.0** armor data (helmets, gauntlets, chest, legs, class items)
  - Filters out legacy armor (pre-Shadowkeep)
  - Includes energy capacity and mod socket information
- Fetches **Armor 2.0** mods with energy costs and stat bonuses
  - Excludes legacy mods from the old system
- Fetches subclass aspects with stat modifiers
- Fetches subclass fragments with stat bonuses/penalties
- Fetches subclass abilities (grenades, melees, class abilities, supers)
- **Resolves stat hashes to human-readable names** using DestinyStatDefinition
- Displays **actual numeric stat values** for easy build crafting
- Caches manifest data to minimize API calls

## Installation

```bash
npm install
```

## Configuration

### Getting a Bungie API Key

1. Go to [Bungie's Developer Portal](https://www.bungie.net/en/Application)
2. Sign in with your Bungie account
3. Click "Create New App"
4. Fill in the required fields:
   - **Application Name**: Any name you want (e.g., "Destiny Data Fetcher")
   - **Website**: Can be any URL (e.g., your GitHub repo URL)
   - **OAuth Client Type**: Select "Not Applicable" (we only need the API key)
5. Accept the terms and create the application
6. Copy the **API Key** shown on the application page

### Setting the API Key

For local development, set your Bungie API key as an environment variable:

```bash
export BUNGIE_API_KEY=your_api_key_here
```

### Setting up GitHub Secrets (for the weekly workflow)

To enable the automated weekly data export:

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Name: `BUNGIE_API_KEY`
5. Value: Paste your Bungie API key
6. Click **Add secret**

## Usage

### Running the Application

```bash
# Set environment variable and run
BUNGIE_API_KEY=your_api_key npm start
```

### Exporting Data to Files

The application can export Destiny 2 data to both JSON and CSV formats.

```bash
# Export all data to both JSON and CSV files in ./data directory
BUNGIE_API_KEY=your_api_key npm run export

# Export only CSV files
BUNGIE_API_KEY=your_api_key npm run export:csv

# Export only JSON files
BUNGIE_API_KEY=your_api_key npm run export:json

# Export to a custom directory (both formats)
BUNGIE_API_KEY=your_api_key node src/exportData.js ./my-output-dir

# Export to a custom directory (CSV only)
BUNGIE_API_KEY=your_api_key node src/exportData.js ./my-output-dir --csv-only

# Export to a custom directory (JSON only)
BUNGIE_API_KEY=your_api_key node src/exportData.js ./my-output-dir --json-only
```

#### CSV Export Features

The CSV export transforms the raw Bungie API data into a more readable format:
- **Readable stat names**: Automatically resolves stat hashes to human-readable names using DestinyStatDefinition (e.g., "Mobility", "Range", "Impact")
- **Actual numeric values**: Shows the exact stat values for weapons and armor, not just hashes
- **Armor 2.0 focused**: Only exports Armor 2.0 items with energy capacity and mod slots
- **Detailed stat bonuses**: Shows stat bonuses/penalties from mods, fragments, and aspects as readable text (e.g., "Mobility: +10")
- **Energy system info**: Includes energy capacity and type for armor pieces
- **Socket information**: Shows number of sockets and mod slots available
- **Flattened structure**: Complex nested objects are flattened for easy viewing in spreadsheet applications
- **Category-specific fields**: Each category (weapons, armor, mods, etc.) includes relevant fields
- **Excel/ChatGPT compatible**: CSV files can be opened in Excel or used with ChatGPT for build recommendations

Exported CSV files include:
- `weapons.csv` - All weapons with stats like Impact, Range, Stability, etc.
- `armor.csv` - All **Armor 2.0** pieces with Mobility, Resilience, Recovery, energy capacity, etc.
- `armor-mods.csv` - All **Armor 2.0** mods with energy costs, slot information, and stat bonuses
- `aspects.csv` - Subclass aspects with stat modifiers
- `fragments.csv` - Subclass fragments with stat bonuses/penalties
- `abilities.csv` - Subclass abilities (grenades, melees, class abilities, supers)
- `subclasses.csv` - All subclass items

#### Using CSV Files with ChatGPT for Build Recommendations

The CSV format makes it easy to get build recommendations from ChatGPT:

1. Export the data to CSV files using `npm run export:csv`
2. Open the relevant CSV file (e.g., `weapons.csv`, `armor.csv`)
3. Upload or paste the CSV content to ChatGPT
4. Ask for build recommendations, such as:
   - "Based on this weapon data, what's the best loadout for PvP?"
   - "Which armor pieces have the highest Resilience and Recovery stats?"
   - "What armor mods should I use for a build focused on grenades?"

The readable stat names and organized structure make it easy for ChatGPT to understand and analyze the data.

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
│   ├── buildCrafting.js     # Build crafting data fetching
│   └── exportData.js        # Data export to JSON files
├── test/
│   └── buildCrafting.test.js # Tests
├── .github/
│   └── workflows/
│       └── weekly-export.yml # Weekly automated export
├── package.json
└── README.md
```

## Automated Weekly Export

This repository includes a GitHub Actions workflow that automatically exports all Destiny 2 build crafting data every week.

### How It Works

- **Schedule**: Runs every Sunday at midnight UTC
- **Output**: Exports weapons, armor, armor mods, aspects, and fragments as JSON files
- **Artifacts**: Data is uploaded as GitHub Actions artifacts with 90-day retention

### Viewing the Exported Data

1. Go to the **Actions** tab in your repository
2. Click on the latest "Weekly Destiny 2 Data Export" workflow run
3. Scroll down to **Artifacts**
4. Download the `destiny2-build-data-*` artifact

### Manual Trigger

You can also trigger the export manually:
1. Go to **Actions** > **Weekly Destiny 2 Data Export**
2. Click **Run workflow** > **Run workflow**

### Requirements

Make sure you have set the `BUNGIE_API_KEY` secret (see Configuration section above).

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

# CSV export integration test (no API key required, uses mock data)
node test/csvExport.integration.test.js

# Integration tests with real API (API key required)
BUNGIE_API_KEY=your_api_key npm test
```

## Requirements

- Node.js 14 or later (Node.js 18+ recommended)

## License

ISC