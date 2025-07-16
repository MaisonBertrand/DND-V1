// Check if Firebase environment variables are configured
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  // Environment variables missing - show user-friendly error
  
  // Show a user-friendly error message on the page
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1f2937;
    color: #f3f4f6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 9999;
  `;
  errorDiv.innerHTML = `
    <h1 style="color: #f59e0b; margin-bottom: 1rem; font-size: 2rem;">🚨 Setup Required</h1>
    <p style="text-align: center; margin-bottom: 2rem; max-width: 600px;">
      This application requires Firebase configuration to work properly. Please create a <code>.env</code> file in the project root with your Firebase credentials.
    </p>
    <div style="background: #374151; padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem; font-family: monospace; white-space: pre-wrap;">
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id</div>
    <p style="text-align: center; color: #9ca3af;">
      See <a href="https://console.firebase.google.com/" target="_blank" style="color: #f59e0b;">Firebase Console</a> to create a project and get your credentials.
    </p>
  `;
  document.body.appendChild(errorDiv);
  
  // Prevent further execution
  throw new Error('Firebase configuration missing');
}

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Error handling for Firestore connection issues
const handleFirestoreError = (error) => {
  // Firestore connection issue - could add reconnection logic here
};

export { auth, db, handleFirestoreError }; 
