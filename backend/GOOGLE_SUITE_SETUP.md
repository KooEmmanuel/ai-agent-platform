# Google Suite Tool Setup Guide

## Prerequisites
1. A Google Cloud Console project
2. Google APIs enabled (Calendar, Drive, Gmail)

## Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Calendar API
   - Google Drive API
   - Gmail API

## Step 2: Create OAuth 2.0 Credentials
1. Go to "Credentials" in the Google Cloud Console
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)
5. Copy the Client ID and Client Secret

## Step 3: Set Environment Variables
Add these to your `.env` file in the backend directory:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

## Step 4: Restart the Backend
After setting the environment variables, restart your backend server:

```bash
cd backend
python main.py
```

## Step 5: Test the Configuration
1. Go to the Google Suite tool configuration
2. Click "Authenticate with Google"
3. Complete the OAuth flow
4. The tool should now be ready to use

## Troubleshooting

### "Google OAuth credentials not configured" Error
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in your `.env` file
- Restart the backend server after adding the environment variables
- Check that the environment variables are loaded correctly

### "Invalid redirect URI" Error
- Make sure the redirect URI in your Google Cloud Console matches exactly:
  - Development: `http://localhost:3000/auth/google/callback`
  - Production: `https://yourdomain.com/auth/google/callback`

### APIs Not Enabled
- Go to Google Cloud Console → APIs & Services → Library
- Enable: Google Calendar API, Google Drive API, Gmail API