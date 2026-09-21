/* VocabTime - Firebase Web Configuration */

// Configuration template provided for client SDK.
// Replace the values below with your own Firebase Project Web Config from https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "AIzaSyBpZzViurNXeA5wGBvI1J0b2fGjX8zwrhk",
  authDomain: "vocabtime-25948.firebaseapp.com",
  projectId: "vocabtime-25948",
  storageBucket: "vocabtime-25948.firebasestorage.app",
  messagingSenderId: "187271748690",
  appId: "1:187271748690:web:28d997aeff187eabc3d38b",
  measurementId: "G-TKYGDB9L49"
};

// Global Firebase initialization helper
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey && 
    !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY") &&
    firebaseConfig.projectId && 
    !firebaseConfig.projectId.includes("your-app-id")
  );
}

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn("Firebase SDK scripts not loaded.");
    return false;
  }
  
  try {
    if (!firebase.apps.length) {
      if (isFirebaseConfigured()) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        console.log("Firebase initialized successfully with project:", firebaseConfig.projectId);
        return true;
      } else {
        console.info("Firebase Config placeholder detected. Operating in local guest mode until Firebase Web Config is added.");
        return false;
      }
    } else {
      firebaseApp = firebase.app();
      firebaseAuth = firebase.auth();
      firebaseDb = firebase.firestore();
      return true;
    }
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
    return false;
  }
}
