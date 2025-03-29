/**
 * VeryFomo Firestore Data Cleanup Script
 * 
 * This script will delete all documents from the specified collections in your Firestore database.
 * Use with caution as this operation cannot be undone.
 * 
 * To run this script:
 * node clear-firestore-data.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyAhr9BaHA0oT32iu-IYdVmY5pGvBDaJAro",
  authDomain: "veryfomo.firebaseapp.com",
  databaseURL: "https://veryfomo-default-rtdb.firebaseio.com",
  projectId: "veryfomo",
  storageBucket: "veryfomo.firebasestorage.app",
  messagingSenderId: "973886593711",
  appId: "1:973886593711:web:da12799a47d7d2f060525a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Collections to clear
const COLLECTIONS_TO_CLEAR = ['users', 'chats', 'messages'];

async function clearCollection(collectionName) {
  console.log(`Clearing collection: ${collectionName}`);
  
  try {
    const collectionRef = collection(firestore, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`  Collection ${collectionName} is already empty.`);
      return 0;
    }
    
    let count = 0;
    const deletePromises = [];
    
    snapshot.forEach(document => {
      console.log(`  Deleting document: ${document.id}`);
      deletePromises.push(deleteDoc(doc(firestore, collectionName, document.id)));
      count++;
    });
    
    await Promise.all(deletePromises);
    console.log(`  Successfully deleted ${count} documents from ${collectionName}`);
    return count;
  } catch (error) {
    console.error(`  Error clearing collection ${collectionName}:`, error);
    throw error;
  }
}

async function clearAllCollections() {
  console.log('Starting Firestore data cleanup...');
  
  let totalDeleted = 0;
  
  for (const collectionName of COLLECTIONS_TO_CLEAR) {
    try {
      const count = await clearCollection(collectionName);
      totalDeleted += count;
    } catch (error) {
      console.error(`Failed to clear collection ${collectionName}:`, error);
    }
  }
  
  console.log(`Cleanup complete. Deleted ${totalDeleted} documents in total.`);
  console.log('Your Firestore database is now clean!');
  
  // Exit the process after cleanup
  process.exit(0);
}

// Run the cleanup
clearAllCollections().catch(error => {
  console.error('Fatal error during cleanup:', error);
  process.exit(1);
});
