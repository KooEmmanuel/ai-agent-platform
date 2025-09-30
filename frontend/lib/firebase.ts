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

// Authentication functions with retry logic for timing issues
export const signInWithGoogle = async (maxRetries: number = 3) => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Get the ID token with force refresh to ensure it's fresh
      const idToken = await user.getIdToken(true);
      
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Backend authentication failed';
        
        // Check if it's a timing issue and we can retry
        if (errorMessage.includes('timing') && attempt < maxRetries) {
          console.log(`🕐 Timing issue detected, retrying in ${(attempt + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`Google sign-in error (attempt ${attempt + 1}):`, error);
      
      // If it's a timing issue and we can retry, wait and try again
      if (error instanceof Error && 
          (error.message.includes('timing') || error.message.includes('too early')) && 
          attempt < maxRetries) {
        console.log(`🕐 Retrying authentication in ${(attempt + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        continue;
      }
      
      // If it's not a timing issue or we've exhausted retries, throw the error
      throw error;
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Authentication failed after multiple attempts');
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