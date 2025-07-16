# Firebase Setup Guide

## Why you're seeing a white screen

The D&D Campaign Manager requires Firebase configuration to work. Without proper Firebase credentials, the application cannot initialize and shows a white screen.

## Quick Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project" or "Add project"
   - Give your project a name (e.g., "dnd-campaign-manager")
   - Follow the setup wizard

2. **Enable Authentication**
   - In your Firebase project, go to "Authentication" in the left sidebar
   - Click "Get started"
   - Go to "Sign-in method" tab
   - Enable "Email/Password" authentication

3. **Create a Web App**
   - In your Firebase project, click the gear icon next to "Project Overview"
   - Select "Project settings"
   - Scroll down to "Your apps" section
   - Click the web icon (</>) to add a web app
   - Give it a name (e.g., "DND-V1")
   - Copy the configuration object

4. **Create Environment File**
   - In your project root, create a file named `.env`
   - Add the following content, replacing the values with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Example Configuration

Your `.env` file should look something like this:

```env
VITE_FIREBASE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
VITE_FIREBASE_AUTH_DOMAIN=my-dnd-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-dnd-project
VITE_FIREBASE_STORAGE_BUCKET=my-dnd-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

## Troubleshooting

- **Still seeing white screen?** Check the browser console (F12) for error messages
- **"Firebase configuration missing" error?** Make sure your `.env` file is in the project root
- **Authentication errors?** Ensure Email/Password authentication is enabled in Firebase
- **Environment variables not loading?** Restart your development server after creating the `.env` file

## Security Note

The `.env` file contains sensitive information. Make sure it's included in your `.gitignore` file to prevent it from being committed to version control.

## Need Help?

- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review the main [README.md](README.md) for more setup details
- Ensure all environment variables are properly set and the development server is restarted 