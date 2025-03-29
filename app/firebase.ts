import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../firebase.config.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Firebase
console.log('Initializing Firebase with web SDK');

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Auth
  // For React Native with Expo Go, we need to use the standard getAuth
  // since we're using the web SDK, not the React Native SDK
  auth = getAuth(app);
  console.log('Firebase Auth initialized for Expo Go');
  
  // Initialize Firestore
  firestore = getFirestore(app);
  
  // Initialize Storage
  storage = getStorage(app);
  console.log('Firebase Storage initialized');
  
  // Debug auth state changes
  onAuthStateChanged(auth, (user) => {
    console.log('Firebase auth state changed:', user ? `User ID: ${user.uid}` : 'No user');
    if (user) {
      // Store user info in AsyncStorage as a backup
      AsyncStorage.setItem('user_auth_state', JSON.stringify({
        uid: user.uid,
        displayName: user.displayName,
        isAnonymous: user.isAnonymous,
        lastLogin: new Date().toISOString()
      })).catch(err => console.error('Error storing auth state in AsyncStorage:', err));
    }
  });
  
  console.log('Firebase web SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { app, auth, firestore, storage };

// Add default export
const firebaseServices = {
  app,
  auth,
  firestore,
  storage
};

export default firebaseServices;
