import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  onAuthStateChanged,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../firebase.config.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Firebase
console.log('Initializing Firebase with web SDK');

// Initialize Firebase app
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native persistence
let auth: Auth;
try {
  // Try to use the React Native specific initialization with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  console.log('Firebase Auth initialized with React Native persistence');
} catch (error) {
  // Fallback to standard auth if the React Native specific method fails
  console.error('Error initializing auth with persistence, falling back to standard auth:', error);
  auth = getAuth(app);
  console.log('Firebase Auth initialized with standard method (no persistence)');
}

// Initialize Firestore and Storage
const firestore: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
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

// Create a default export object to satisfy the router
const firebaseServices = {
  app,
  auth,
  firestore,
  storage
};

export { app, auth, firestore, storage };
export default firebaseServices;
