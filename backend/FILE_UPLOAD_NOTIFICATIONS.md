# File Upload Email Notifications

This feature automatically sends email notifications when users upload files to your AI Agent Platform.

## Features

- ✅ Automatic email notifications for all file uploads
- ✅ Configurable notification recipients
- ✅ Rich HTML email templates
- ✅ Context-aware notifications (Project Management, Knowledge Base, File Library)
- ✅ User information included in notifications
- ✅ File details (name, size, type) included
- ✅ Test notification functionality
- ✅ Non-blocking (upload won't fail if email fails)

## Configuration

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Enable/disable notifications
FILE_UPLOAD_NOTIFICATION_ENABLED=true

# Email addresses to notify (comma-separated)
FILE_UPLOAD_NOTIFICATION_EMAILS=admin@yourcompany.com,manager@yourcompany.com

# SMTP Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourcompany.com
SMTP_FROM_NAME=Your Company Platform
```

### 2. Gmail Setup (if using Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `SMTP_PASSWORD`

### 3. Other SMTP Providers

The system works with any SMTP provider. Common configurations:

**Outlook/Hotmail:**
```bash
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
```

**SendGrid:**
```bash
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```bash
SMTP_SERVER=smtp.mailgun.org
SMTP_PORT=587
```

## Usage

### Automatic Notifications

Once configured, notifications are sent automatically when users upload files to:

- **Project Management** - Task file uploads
- **Knowledge Base** - Collection file uploads  
- **File Library** - General file uploads

### Testing Notifications

#### Option 1: Test Script
```bash
cd backend
python test_file_notifications.py
```

#### Option 2: API Endpoint
```bash
# Check notification status
curl -X GET "http://localhost:8000/api/v1/file-notifications/status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send test notification
curl -X POST "http://localhost:8000/api/v1/file-notifications/test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_email": "test@example.com",
    "test_filename": "test-document.pdf",
    "test_context": "Test Upload"
  }'
```

## Email Template

The notification emails include:

- **File Details**: Name, size, type, upload time
- **User Information**: Name, email, organization
- **Context**: Where the file was uploaded (Project Management, Knowledge Base, etc.)
- **Professional Design**: HTML template with your branding

## API Endpoints

### GET `/api/v1/file-notifications/status`
Get current notification configuration status.

### POST `/api/v1/file-notifications/test`
Send a test notification to verify configuration.

### GET `/api/v1/file-notifications/config`
Get notification configuration (admin only).

## Troubleshooting

### Notifications Not Sending

1. **Check Environment Variables**
   ```bash
   # Verify these are set correctly
   echo $FILE_UPLOAD_NOTIFICATION_ENABLED
   echo $FILE_UPLOAD_NOTIFICATION_EMAILS
   echo $SMTP_USERNAME
   echo $SMTP_PASSWORD
   ```

2. **Test SMTP Connection**
   ```bash
   cd backend
   python test_file_notifications.py
   ```

3. **Check Logs**
   - Look for error messages in your application logs
   - SMTP errors are logged but don't fail the upload

### Common Issues

**"SMTP Authentication Failed"**
- Verify username/password
- For Gmail, use App Password, not regular password
- Check if 2FA is enabled

**"No notification emails configured"**
- Set `FILE_UPLOAD_NOTIFICATION_EMAILS` in .env
- Use comma-separated email addresses

**"Notifications are disabled"**
- Set `FILE_UPLOAD_NOTIFICATION_ENABLED=true` in .env

## Security Notes

- SMTP credentials are stored in environment variables
- Email notifications don't include sensitive file content
- Upload process continues even if email fails
- Only configured email addresses receive notifications

## Customization

### Email Template
Edit `backend/app/services/file_upload_notification_service.py` to customize the email template.

### Notification Logic
Modify the `send_file_upload_notification` method to add custom logic (e.g., different emails for different file types).

### Additional Context
Add more context information by modifying the `upload_context` parameter in the upload endpoints.
