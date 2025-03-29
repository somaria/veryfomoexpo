const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');
const app = initializeApp({
  credential: cert(serviceAccount)
});

// Clear all users and Firestore data
const clearFirebaseData = async () => {
  console.log('Starting to clear Firebase data...');
  
  // Clear all users in Firebase Authentication
  await clearAllUsers();
  
  // Clear all data in Firestore
  await clearFirestore();
  
  console.log('Firebase data clearing complete!');
};

// Function to clear all users in Firebase Authentication
const clearAllUsers = async () => {
  const auth = getAuth();
  
  try {
    console.log('Listing all users...');
    
    // List all users
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;
    
    if (users.length === 0) {
      console.log('No users found to delete.');
      return;
    }
    
    console.log(`Found ${users.length} users to delete.`);
    
    // Delete each user
    for (const user of users) {
      try {
        await auth.deleteUser(user.uid);
        console.log(`Deleted user: ${user.email || user.uid}`);
      } catch (error) {
        console.error(`Error deleting user ${user.uid}:`, error);
      }
    }
    
    console.log('All users deleted successfully.');
  } catch (error) {
    console.error('Error listing/deleting users:', error);
  }
};

// Function to clear all data in Firestore
const clearFirestore = async () => {
  const firestore = getFirestore();
  
  try {
    console.log('Clearing Firestore data...');
    
    // Get all collections
    const collections = await firestore.listCollections();
    
    if (collections.length === 0) {
      console.log('No collections found to delete.');
      return;
    }
    
    console.log(`Found ${collections.length} collections to clear.`);
    
    // Delete all documents in each collection
    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`Clearing collection: ${collectionName}`);
      
      const batchSize = 500;
      const query = firestore.collection(collectionName).limit(batchSize);
      
      await deleteQueryBatch(firestore, query, batchSize);
      
      console.log(`Collection ${collectionName} cleared.`);
    }
    
    console.log('All Firestore data cleared successfully.');
  } catch (error) {
    console.error('Error clearing Firestore data:', error);
  }
};

// Helper function to delete documents in batches
async function deleteQueryBatch(db, query, batchSize) {
  while (true) {
    const snapshot = await query.get();
    
    // When there are no documents left, we are done
    if (snapshot.size === 0) {
      break;
    }
    
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted batch of ${snapshot.size} documents`);
    
    // If there are fewer documents than the batch size, we're done
    if (snapshot.size < batchSize) {
      break;
    }
  }
}

// Run the script
clearFirebaseData().catch(console.error);
