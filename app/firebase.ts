import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase.config.js';

// Initialize Firebase
console.log('Initializing Firebase with web SDK');

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Auth
  auth = getAuth(app);
  
  // Initialize Firestore
  firestore = getFirestore(app);
  
  console.log('Firebase web SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { app, auth, firestore };
