const { google } = require('googleapis');
const { transformItemsForCSV } = require('./csvExport');

/**
 * Create Google Sheets API client
 * @param {object} credentials - Google service account credentials or OAuth2 credentials
 * @returns {object} - Google Sheets API client
 */
function createSheetsClient(credentials) {
  let auth;
  
  if (credentials.type === 'service_account') {
    // Service account authentication
    auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  } else if (credentials.access_token) {
    // OAuth2 token authentication
    auth = new google.auth.OAuth2();
    auth.setCredentials(credentials);
  } else {
    throw new Error(
      'Invalid credentials format. Expected one of:\n' +
      '1. Service account credentials (must include "type": "service_account", "private_key", "client_email")\n' +
      '2. OAuth2 credentials (must include "access_token")'
    );
  }
  
  return google.sheets({ version: 'v4', auth });
}

/**
 * Convert transformed data to Google Sheets values array
 * @param {object[]} transformedData - Transformed data
 * @returns {array} - 2D array of values for Google Sheets
 */
function dataToSheetValues(transformedData) {
  if (!transformedData || transformedData.length === 0) {
    return [];
  }
  
  // Get headers from first item
  const headers = Object.keys(transformedData[0]);
  
  // Convert data to rows
  const rows = transformedData.map(item => {
    return headers.map(header => {
      const value = item[header];
      // Convert to string for Google Sheets
      return value === null || value === undefined ? '' : String(value);
    });
  });
  
  // Add headers as first row
  return [headers, ...rows];
}

/**
 * Create a new Google Sheet with build crafting data
 * @param {object} sheets - Google Sheets API client
 * @param {string} title - Title for the spreadsheet
 * @param {object} buildData - Build crafting data object
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 * @returns {Promise<object>} - Created spreadsheet info
 */
async function createBuildCraftingSheet(sheets, title, buildData, statDefs = null) {
  try {
    // Create a new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title
        }
      }
    });
    
    const spreadsheetId = spreadsheet.data.spreadsheetId;
    console.log(`Created spreadsheet: ${title}`);
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    console.log(`URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    
    // Prepare worksheets data
    const worksheets = [
      { name: 'Weapons', data: buildData.weapons, category: 'weapons' },
      { name: 'Armor', data: buildData.armor, category: 'armor' },
      { name: 'Armor Mods', data: buildData.armorMods, category: 'armorMods' },
      { name: 'Subclasses', data: buildData.subclasses, category: 'subclasses' },
      { name: 'Aspects', data: buildData.aspects, category: 'aspects' },
      { name: 'Fragments', data: buildData.fragments, category: 'fragments' },
      { name: 'Abilities', data: buildData.abilities, category: 'abilities' },
      { name: 'Damage Types', data: buildData.damageTypes, category: 'damageTypes' },
      { name: 'Artifact Mods', data: buildData.artifactMods, category: 'artifactMods' },
      { name: 'Champion Mods', data: buildData.championMods, category: 'championMods' }
    ];
    
    // First, rename the default sheet and add other sheets
    const requests = [];
    let actualSheetIndex = 0;
    
    // Filter worksheets with data and assign sheet IDs
    const validWorksheets = worksheets
      .filter(({ data }) => data && data.length > 0)
      .map((ws, index) => ({ ...ws, sheetId: index }));
    
    for (const { name, sheetId } of validWorksheets) {
      if (sheetId === 0) {
        // Rename the default sheet
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              title: name
            },
            fields: 'title'
          }
        });
      } else {
        // Add new sheet
        requests.push({
          addSheet: {
            properties: {
              title: name,
              sheetId: sheetId
            }
          }
        });
      }
    }
    
    // Execute batch update to create/rename sheets
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: requests
        }
      });
    }
    
    // Now populate each sheet with data
    for (const { name, data, category } of validWorksheets) {
      // Transform data
      const transformedData = transformItemsForCSV(data, category, statDefs);
      const values = dataToSheetValues(transformedData);
      
      // Update sheet with data
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${name}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: values
        }
      });
      
      console.log(`Added ${data.length} ${name} to sheet`);
    }
    
    // Format headers (make them bold)
    const formatRequests = [];
    for (const { sheetId } of validWorksheets) {
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true
              },
              backgroundColor: {
                red: 0.9,
                green: 0.9,
                blue: 0.9
              }
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)'
        }
      });
      
      // Freeze header row
      formatRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: {
              frozenRowCount: 1
            }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });
    }
    
    if (formatRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: formatRequests
        }
      });
    }
    
    return {
      spreadsheetId: spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      title: title
    };
    
  } catch (error) {
    console.error('Error creating Google Sheet:', error.message);
    throw error;
  }
}

/**
 * Export build crafting data to Google Sheets
 * @param {object} credentials - Google service account credentials or OAuth2 credentials
 * @param {string} title - Title for the spreadsheet
 * @param {object} buildData - Build crafting data object
 * @param {object} statDefs - Optional stat definitions for resolving stat hashes
 * @returns {Promise<object>} - Created spreadsheet info
 */
async function exportToGoogleSheets(credentials, title, buildData, statDefs = null) {
  const sheets = createSheetsClient(credentials);
  return await createBuildCraftingSheet(sheets, title, buildData, statDefs);
}

module.exports = {
  createSheetsClient,
  createBuildCraftingSheet,
  exportToGoogleSheets,
  dataToSheetValues
};
