// Firebase configuration and authentication utilities

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAvcg683mzMA5w0PpnXSq40vj3GvbrmVh8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kwickflow-ed755.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kwickflow-ed755",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kwickflow-ed755.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "773090224826",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:773090224826:web:7180333253180f3318b083",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-NTLTY8WN36"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    // Send token to our backend
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_token: idToken
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Store the token and user data
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } else {
      throw new Error('Backend authentication failed');
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { auth, googleProvider }; 