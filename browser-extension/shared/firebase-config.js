// Firebase configuration for browser extension
// This matches the frontend configuration

const firebaseConfig = {
  apiKey: "AIzaSyAvcg683mzMA5w0PpnXSq40vj3GvbrmVh8",
  authDomain: "kwickflow-ed755.firebaseapp.com",
  projectId: "kwickflow-ed755",
  storageBucket: "kwickflow-ed755.firebasestorage.app",
  messagingSenderId: "773090224826",
  appId: "1:773090224826:web:7180333253180f3318b083",
  measurementId: "G-NTLTY8WN36"
};

// Backend API URL
const API_BASE_URL = 'https://kwickbuild.up.railway.app'; // Production URL

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, API_BASE_URL };
} else {
  window.firebaseConfig = firebaseConfig;
  window.API_BASE_URL = API_BASE_URL;
}
