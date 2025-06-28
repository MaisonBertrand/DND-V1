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
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
db.settings({
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
  ignoreUndefinedProperties: true
});

// Error handling for Firestore connection issues
const handleFirestoreError = (error) => {
  console.warn('Firestore connection issue:', error);
  
  // If it's a network error, try to reconnect
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    console.log('Attempting to reconnect to Firestore...');
    enableNetwork(db).catch(console.error);
  }
};

// Add global error handler for Firestore
db.enableNetwork().catch(handleFirestoreError);

export { auth, db, handleFirestoreError }; 
