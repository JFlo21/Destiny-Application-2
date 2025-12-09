# Verification Guide for Changes

This document describes how to verify the changes made to fix weapon/armor data export and enable Google Sheets.

## Changes Made

1. **Removed season filtering from weapons** - Now exports ALL weapons, not just current season
2. **Removed season filtering from armor** - Now exports ALL Armor 2.0 pieces, not just current season  
3. **Removed season filtering from armor mods** - Now exports ALL Armor 2.0 mods, not just current season
4. **Removed season filtering from subclass items** - Aspects, fragments, and abilities now export across all seasons
5. **Kept season filtering for seasonal items** - Artifact mods and champion mods still filter to current season (as intended)
6. **Enabled Google Sheets export** - Weekly workflow now exports to Google Sheets when credentials are configured

## Verification Steps

### 1. Verify Weapons and Armor Export (Manual Test)

Run the following command with a valid Bungie API key:

```bash
BUNGIE_API_KEY=your_api_key npm start
```

**Expected Results:**
- Output should show a much larger count of weapons (hundreds to thousands)
- Output should show a much larger count of armor pieces (hundreds to thousands)
- Compare against previous runs that showed only current season items

### 2. Verify Export to Files

Run the export command:

```bash
BUNGIE_API_KEY=your_api_key npm run export
```

**Expected Results:**
- `data/weapons.json` and `data/weapons.csv` should contain many more weapons than before
- `data/armor.json` and `data/armor.csv` should contain many more armor pieces than before
- `data/armor-mods.json` and `data/armor-mods.csv` should contain more mods
- `data/aspects.json`, `data/fragments.json`, and `data/abilities.json` should contain more items
- `data/artifact-mods.json` should still only contain current season items
- `data/champion-mods.json` should still only contain current season items

### 3. Verify Google Sheets Export (Optional)

If you have Google Sheets credentials set up:

```bash
BUNGIE_API_KEY=your_api_key GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}' npm run export:google-sheets
```

**Expected Results:**
- A new Google Spreadsheet is created
- The console shows a spreadsheet URL
- The spreadsheet contains worksheets for all categories: Weapons, Armor, Armor Mods, Aspects, Fragments, Abilities, Damage Types, Artifact Mods, Champion Mods, Enemy Weaknesses
- Each worksheet is populated with data

### 4. Verify Weekly Workflow (GitHub Actions)

Trigger the workflow manually or wait for the scheduled run:

1. Go to Actions > Weekly Destiny 2 Data Export
2. Click "Run workflow"
3. Wait for completion
4. Download the artifact

**Expected Results:**
- Workflow completes successfully
- Artifact contains JSON, CSV, and Excel files
- Files contain comprehensive weapon and armor data
- If `GOOGLE_SHEETS_CREDENTIALS` secret is set, Google Sheets export succeeds

### 5. Verify Documentation Updates

Check the README:

- Features section should mention "all weapons" and "all Armor 2.0" instead of "current season only"
- Automated weekly export section should mention Google Sheets support
- Instructions for setting up `GOOGLE_SHEETS_CREDENTIALS` secret should be included

## Comparison Data

### Before Changes
- Weapons: ~10-50 items (current season only)
- Armor: ~5-30 items (current season only)
- Armor Mods: ~10-50 items (current season only)

### After Changes
- Weapons: 500+ items (all weapons in the game)
- Armor: 200+ items (all Armor 2.0 pieces)
- Armor Mods: 100+ items (all Armor 2.0 mods)
- Aspects: 50+ items (all aspects)
- Fragments: 100+ items (all fragments)
- Abilities: 100+ items (all abilities)

## Rollback Plan

If issues are discovered, revert the changes in `src/buildCrafting.js` by adding back the season filtering:

```javascript
// In getWeapons():
const seasonHash = await getCurrentSeasonHash(client);
return filterByCurrentSeason(allWeapons, seasonHash);

// In getArmor():
const seasonHash = await getCurrentSeasonHash(client);
return filterByCurrentSeason(armor2_0, seasonHash);

// etc.
```

## Success Criteria

- ✅ All existing unit tests pass
- ✅ Weapons export shows significantly more items
- ✅ Armor export shows significantly more items
- ✅ Google Sheets export works when credentials are provided
- ✅ Weekly workflow can export to Google Sheets (when configured)
- ✅ Documentation accurately reflects the changes
