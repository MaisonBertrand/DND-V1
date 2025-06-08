// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB03_k8EtLUwp-FMeP5rA1J4e-zsvoezRo",
    authDomain: "dnd-v1.firebaseapp.com",
    projectId: "dnd-v1",
    storageBucket: "dnd-v1.firebasestorage.app",
    messagingSenderId: "487343651560",
    appId: "1:487343651560:web:161406ad3342a11fb6275d",
    measurementId: "G-2QSZPSLMQY"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export initialized services
export { app, auth, db, analytics }; 