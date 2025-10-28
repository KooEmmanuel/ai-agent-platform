# Quick Start Guide

## 🚀 Load the Extension

1. **Open Chrome** and go to `chrome://extensions/`
2. **Enable Developer mode** (toggle in top-right)
3. **Click "Load unpacked"**
4. **Select this folder**: `browser-extension`
5. **Click "Select Folder"**

## ✅ Success!

You should see "AI Agent Assistant" in your extensions list.

## 🧪 Test the Extension

1. **Click the extension icon** in Chrome toolbar (🤖)
2. **Login** with your platform credentials:
   - **Email/Password**: Use your existing account (if not Google-only)
   - **Google Login**: Click "Continue with Google" to open web platform
3. **Select an organization**
4. **Choose an agent**
5. **Start chatting!** The floating chatbot will appear

## 🔧 Troubleshooting

### Extension won't load?
- Make sure you selected the `browser-extension` folder (not parent folder)
- Check that all files are present
- Try refreshing the extensions page

### Can't see the extension icon?
- Look for the puzzle piece icon (🧩) in Chrome toolbar
- Click it to find "AI Agent Assistant"
- Pin the extension for easy access

### Login not working?
- Make sure your backend is running
- Check your credentials
- For Google login: Complete login in the web platform first
- Look for error messages in the popup
- Check browser console for detailed errors

### Google Login Process:
1. **Click "Continue with Google"** in the extension
2. **Extension opens** https://www.drixai.com/auth/login
3. **Click "Continue with Google"** in the opened login page
4. **Complete Google OAuth** in the popup
5. **Return to the extension** and click "Check Login Status"
6. **Extension will automatically** detect your login and proceed

### Debugging Steps:
1. **Open Chrome DevTools** (F12)
2. **Go to Console tab**
3. **Click the extension icon** and try to login
4. **Look for error messages** starting with 🌐, 📡, ❌, or ✅
5. **Check the Network tab** to see if API calls are being made

### Common Issues:
- **"Invalid response from server"**: Check if backend is running and accessible
- **"Network error"**: Check internet connection and CORS settings
- **"401 Unauthorized"**: Check email/password credentials
- **"CORS error"**: Backend needs to allow extension origin

## 📝 Notes

- The extension uses emoji icons (🤖) instead of image files
- All functionality is the same as the web platform
- Your conversations are stored locally in the browser
- The chatbot appears on any website you visit

## 🎯 Next Steps

Once it's working:
1. Test on different websites
2. Try different agents
3. Test the drag/resize functionality
4. Check conversation persistence

Happy testing! 🚀
