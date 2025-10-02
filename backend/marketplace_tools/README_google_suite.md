# Google Suite Integration Tool

A comprehensive tool for integrating with Google's ecosystem including Google Calendar, Google Drive, and Gmail.

## Features

### 🔐 OAuth2 Authentication
- Secure OAuth2 authentication flow
- Automatic token refresh
- Persistent authentication storage
- Easy re-authentication when tokens expire

### 📅 Google Calendar Integration
- **List Events**: Get upcoming events from any calendar
- **Create Events**: Schedule new events with attendees
- **Update Events**: Modify existing events
- **Delete Events**: Remove events from calendar

### 📁 Google Drive Integration
- **List Files**: Browse files and folders
- **Upload Files**: Upload documents, images, and other files
- **Download Files**: Download files from Drive
- **Share Files**: Set sharing permissions for files

### 📧 Gmail Integration
- **Send Emails**: Send emails with attachments
- **Read Emails**: Retrieve and read email messages
- **Search Emails**: Search through email history
- **Email Management**: Organize and manage emails

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Calendar API
   - Google Drive API
   - Gmail API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `https://your-domain.com/auth/google/callback`
7. Download the credentials JSON file

### 2. Tool Configuration

Update the tool configuration with your Google OAuth credentials:

```json
{
  "client_id": "your-google-client-id",
  "client_secret": "your-google-client-secret",
  "redirect_uri": "https://your-domain.com/auth/google/callback"
}
```

### 3. Authentication Flow

1. **First Time Setup**: Users click "Authenticate" button
2. **OAuth Flow**: Redirected to Google for authorization
3. **Token Storage**: Access and refresh tokens stored securely
4. **Automatic Refresh**: Tokens refreshed automatically when needed

## Usage Examples

### Calendar Operations

```python
# List upcoming events
result = await tool.execute(
    operation='calendar_events',
    calendar_id='primary',
    max_results=10
)

# Create a new event
result = await tool.execute(
    operation='calendar_create_event',
    event_title='Team Meeting',
    event_start='2024-01-15T10:00:00Z',
    event_end='2024-01-15T11:00:00Z',
    event_description='Weekly team sync',
    attendees=['colleague@company.com']
)
```

### Drive Operations

```python
# List files in Drive
result = await tool.execute(
    operation='drive_list_files',
    folder_id='root',
    max_results=20
)

# Upload a file
result = await tool.execute(
    operation='drive_upload_file',
    file_name='report.pdf',
    file_content=pdf_content,
    folder_id='your-folder-id'
)
```

### Gmail Operations

```python
# Send an email
result = await tool.execute(
    operation='gmail_send',
    to_email='recipient@example.com',
    subject='Important Update',
    body='Please review the attached document.'
)

# Search emails
result = await tool.execute(
    operation='gmail_search',
    query='from:important@company.com',
    max_results=5
)
```

## Authentication States

### 🔴 Not Authenticated
- User needs to complete OAuth flow
- Tool shows authentication URL
- No Google services accessible

### 🟡 Authenticated (Expired)
- Access token expired
- Refresh token available
- Automatic token refresh attempted
- Manual re-authentication if refresh fails

### 🟢 Fully Authenticated
- Valid access token available
- All Google services accessible
- Automatic token refresh working

## Security Features

- **Secure Token Storage**: Tokens encrypted and stored securely
- **Automatic Refresh**: Seamless token renewal
- **Scope Management**: Minimal required permissions
- **Error Handling**: Graceful handling of auth failures
- **Re-authentication**: Easy re-auth when needed

## Error Handling

The tool handles various error scenarios:

- **Invalid Credentials**: Clear error messages for setup issues
- **Expired Tokens**: Automatic refresh or re-auth prompts
- **API Limits**: Rate limiting and quota management
- **Network Issues**: Retry logic for temporary failures
- **Permission Errors**: Clear guidance on required permissions

## Best Practices

1. **Minimal Scopes**: Only request necessary permissions
2. **Token Security**: Store tokens securely, never in logs
3. **Error Handling**: Always handle authentication errors
4. **User Experience**: Provide clear auth status to users
5. **Testing**: Test with different Google accounts

## Troubleshooting

### Common Issues

1. **"Invalid Client"**: Check client ID and secret
2. **"Redirect URI Mismatch"**: Verify redirect URI in Google Console
3. **"Access Denied"**: User needs to grant permissions
4. **"Token Expired"**: Re-authenticate or check refresh token

### Debug Steps

1. Verify Google Cloud Console setup
2. Check OAuth credentials
3. Test redirect URI
4. Verify API enablement
5. Check token storage

## Support

For issues with the Google Suite Tool:

1. Check Google Cloud Console configuration
2. Verify OAuth credentials
3. Test authentication flow
4. Review error logs
5. Contact support with specific error messages

## Changelog

### v1.0.0
- Initial release
- OAuth2 authentication
- Calendar, Drive, and Gmail integration
- Automatic token refresh
- Comprehensive error handling