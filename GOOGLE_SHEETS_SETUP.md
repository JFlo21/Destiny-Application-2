# Google Sheets Export Setup Guide

This guide explains how to set up Google Sheets API credentials to export Destiny 2 build data to Google Sheets.

## Prerequisites

- A Google Cloud account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Destiny 2 Build Data Export")
5. Click "Create"

## Step 2: Enable Google Sheets API

1. In your project, navigate to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on "Google Sheets API"
4. Click "Enable"

## Step 3: Create a Service Account

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Enter a name for the service account (e.g., "destiny-data-exporter")
4. (Optional) Add a description
5. Click "Create and Continue"
6. (Optional) Grant roles - you can skip this for basic usage
7. Click "Continue" and then "Done"

## Step 4: Create and Download Credentials

1. In the "Credentials" page, find your service account in the list
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Select "JSON" as the key type
6. Click "Create"
7. The JSON key file will be downloaded to your computer
8. **Important**: Keep this file secure! It provides access to your Google account.

## Step 5: Using the Credentials

### Option 1: Using a Credentials File

Save the downloaded JSON file somewhere secure (e.g., `~/.google/destiny-exporter-credentials.json`) and use it with the export command:

```bash
BUNGIE_API_KEY=your_api_key npm run export:google-sheets -- --google-sheets-credentials ~/.google/destiny-exporter-credentials.json
```

### Option 2: Using an Environment Variable

Set the credentials as an environment variable (useful for CI/CD):

```bash
export GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'
BUNGIE_API_KEY=your_api_key npm run export:google-sheets
```

For GitHub Actions, add the credentials as a repository secret:
1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `GOOGLE_SHEETS_CREDENTIALS`
5. Value: Paste the entire contents of your JSON credentials file
6. Click "Add secret"

## Step 6: Share the Spreadsheet

After exporting, the script will output a URL to your new Google Spreadsheet. To share it:

1. Open the spreadsheet URL in your browser
2. Click the "Share" button
3. Add email addresses of people you want to share with, or
4. Click "Change to anyone with the link" to make it publicly viewable
5. Choose permission level (Viewer, Commenter, or Editor)

## Example Credentials File Structure

Your JSON credentials file should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## Troubleshooting

### Permission Denied Errors

If you get permission errors, make sure:
1. The Google Sheets API is enabled for your project
2. Your service account has the necessary permissions
3. You're using the correct credentials file

### Invalid Credentials

If you get "Invalid credentials" errors:
1. Verify the JSON file is correctly formatted
2. Ensure you haven't modified the JSON file
3. Try creating a new service account key

### Spreadsheet Not Found

If the spreadsheet URL doesn't work:
1. Make sure the export completed successfully
2. Check the console output for the spreadsheet URL
3. Verify your internet connection during export

## Security Best Practices

1. **Never commit credentials to version control**
   - Add `*.json` containing credentials to `.gitignore`
   - Use environment variables for CI/CD
   
2. **Restrict service account permissions**
   - Only grant the minimum necessary permissions
   - Consider using separate service accounts for different purposes

3. **Rotate credentials periodically**
   - Delete old keys that are no longer used
   - Create new keys if credentials may have been compromised

4. **Monitor API usage**
   - Check the Google Cloud Console for unexpected API calls
   - Set up billing alerts to avoid unexpected charges

## Additional Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Service Account Authentication](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
- [Google Cloud Console](https://console.cloud.google.com/)
