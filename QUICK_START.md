# Quick Start Guide for New Export Features

This guide will help you quickly start using the new export features that fix the stat hash issue and add Excel and Google Sheets support.

## Problem Solved

Previously, stats were showing as hash numbers like `Stat_999999999` instead of human-readable names. This has been completely fixed! All exports now show proper stat names like "Mobility", "Range", "Impact", etc.

## Quick Export Commands

### CSV Export (Fixed - No More Hash Numbers!)
```bash
BUNGIE_API_KEY=your_api_key npm run export:csv
```

This creates individual CSV files with all stats properly named:
- `weapons.csv` - All weapons with readable stats
- `armor.csv` - All armor with stat names
- `armor-mods.csv` - Mods with stat bonuses clearly labeled
- And more...

### Excel Export (NEW!)

**Individual Excel Files:**
```bash
BUNGIE_API_KEY=your_api_key npm run export:excel
```

**Master Excel Workbook (Recommended):**
```bash
BUNGIE_API_KEY=your_api_key npm run export:excel-master
```

This creates a single `destiny2-build-data-master.xlsx` file with:
- All categories in separate worksheets
- Professional formatting (bold headers, frozen rows)
- Auto-filters for easy sorting
- Perfect for sharing with your team or uploading to ChatGPT

### Google Sheets Export (NEW!)

**Prerequisites:** You need Google API credentials (see GOOGLE_SHEETS_SETUP.md for details)

```bash
# Using credentials file
BUNGIE_API_KEY=your_api_key npm run export:google-sheets -- --google-sheets-credentials ./credentials.json

# Using environment variable
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}' BUNGIE_API_KEY=your_api_key npm run export:google-sheets
```

This creates a Google Spreadsheet and gives you a shareable link!

## Best Format for ChatGPT/Claude Analysis

For AI analysis and build recommendations, use the **Master Excel Workbook**:

```bash
BUNGIE_API_KEY=your_api_key npm run export:excel-master
```

Then upload `destiny2-build-data-master.xlsx` to ChatGPT and ask:
- "Based on this weapon data, what's the best PvP loadout?"
- "Which armor pieces maximize Resilience and Recovery?"
- "Suggest a complete build for a Warlock focused on grenades"
- "Analyze the meta weapons and recommend a competitive loadout"

The AI can now understand all stats perfectly because they're all properly named!

## Verifying Stats Are Fixed

To verify stats are no longer showing as hashes:

1. Export any format: `BUNGIE_API_KEY=your_api_key npm run export:csv`
2. Open any file (e.g., `data/weapons.csv`)
3. Look for stat columns - you should see:
   - ✅ "Mobility", "Range", "Impact", etc.
   - ❌ NOT "Stat_999999999" or similar hash numbers

## Common Use Cases

### 1. Share Build Data with Your Clan
```bash
# Export to Google Sheets
BUNGIE_API_KEY=your_api_key npm run export:google-sheets -- --google-sheets-credentials ./credentials.json
# Share the URL with your clan
```

### 2. Analyze Builds with AI
```bash
# Export to Excel master file
BUNGIE_API_KEY=your_api_key npm run export:excel-master
# Upload destiny2-build-data-master.xlsx to ChatGPT
```

### 3. Create Spreadsheet for Personal Build Planning
```bash
# Export to Excel
BUNGIE_API_KEY=your_api_key npm run export:excel-master
# Open in Excel/Google Sheets and add your own columns for notes, ratings, etc.
```

### 4. Export All Formats at Once
```bash
BUNGIE_API_KEY=your_api_key npm run export:all
```

This creates CSV, JSON, and Excel files in the `./data` directory.

## What's New in Each File

All exported files now include:
- **Human-readable stat names** (no more hash numbers!)
- **Actual numeric values** for all stats
- **Stat bonuses** clearly labeled (e.g., "Mobility: +10")
- **All Armor 2.0 data** with energy capacity and mod slots
- **Organized structure** perfect for spreadsheet analysis

## Example: Using with ChatGPT

1. Run: `BUNGIE_API_KEY=your_api_key npm run export:excel-master`
2. Upload `destiny2-build-data-master.xlsx` to ChatGPT
3. Ask: "I want to create a PvE build for a Titan focused on survivability. Based on this data, what armor pieces, mods, and weapons should I use?"
4. ChatGPT will analyze all the properly-named stats and give you specific recommendations!

## Need Help?

- CSV/Excel exports not working? Make sure you have a valid `BUNGIE_API_KEY`
- Google Sheets issues? See `GOOGLE_SHEETS_SETUP.md` for detailed setup
- Stats still showing as hashes? This shouldn't happen anymore - please report if you see this!

## Summary

You now have three export formats (CSV, Excel, Google Sheets) that all properly show stat names instead of hash numbers. The data is ready for:
- ✅ Human analysis in spreadsheets
- ✅ AI-powered build recommendations
- ✅ Sharing with your team/clan
- ✅ Personal build planning

Choose the format that works best for your use case!
