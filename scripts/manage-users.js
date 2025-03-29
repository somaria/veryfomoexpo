const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const firestore = admin.firestore();

// Function to delete all users
async function deleteAllUsers() {
  try {
    console.log('Listing all users...');
    const listUsersResult = await auth.listUsers();
    
    if (listUsersResult.users.length === 0) {
      console.log('No users found to delete.');
      return;
    }
    
    console.log(`Found ${listUsersResult.users.length} users to delete.`);
    
    // Get all user UIDs
    const userUids = listUsersResult.users.map(user => user.uid);
    
    // Delete users in batches of 10
    const batchSize = 10;
    for (let i = 0; i < userUids.length; i += batchSize) {
      const batch = userUids.slice(i, i + batchSize);
      await Promise.all(batch.map(uid => {
        console.log(`Deleting user: ${uid}`);
        return auth.deleteUser(uid);
      }));
    }
    
    console.log('All users have been deleted successfully.');
  } catch (error) {
    console.error('Error deleting users:', error);
  }
}

// Function to create test users
async function createTestUsers() {
  const testUsers = [
    { email: 'iphoneuser1@test.com', password: 'test123', displayName: 'iPhone User 1' },
    { email: 'iphoneuser2@test.com', password: 'test123', displayName: 'iPhone User 2' },
    { email: 'iphoneuser3@test.com', password: 'test123', displayName: 'iPhone User 3' },
    { email: 'androiduser1@test.com', password: 'test123', displayName: 'Android User 1' },
    { email: 'androiduser2@test.com', password: 'test123', displayName: 'Android User 2' },
    { email: 'androiduser3@test.com', password: 'test123', displayName: 'Android User 3' }
  ];
  
  try {
    for (const user of testUsers) {
      try {
        console.log(`Creating user: ${user.email}`);
        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true
        });
        console.log(`User created with UID: ${userRecord.uid}`);
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`User ${user.email} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    console.log('All test users have been created successfully.');
  } catch (error) {
    console.error('Error creating test users:', error);
  }
}

// Function to delete all Firestore data
async function clearFirestoreData() {
  try {
    console.log('Clearing Firestore data...');
    
    // Get all collections
    const collections = await firestore.listCollections();
    
    if (collections.length === 0) {
      console.log('No collections found to delete.');
      return;
    }
    
    console.log(`Found ${collections.length} collections to clear.`);
    
    // For each collection, delete all documents
    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`Clearing collection: ${collectionName}`);
      
      // Get all documents in the collection
      const documents = await collection.get();
      
      if (documents.empty) {
        console.log(`Collection ${collectionName} is already empty.`);
        continue;
      }
      
      console.log(`Found ${documents.size} documents to delete in ${collectionName}.`);
      
      // Delete documents in batches
      const batchSize = 500; // Firestore batch limit is 500
      let batch = firestore.batch();
      let count = 0;
      
      for (const doc of documents.docs) {
        batch.delete(doc.ref);
        count++;
        
        // If we've reached the batch limit, commit and start a new batch
        if (count >= batchSize) {
          await batch.commit();
          console.log(`Deleted batch of ${count} documents from ${collectionName}.`);
          batch = firestore.batch();
          count = 0;
        }
      }
      
      // Commit any remaining documents
      if (count > 0) {
        await batch.commit();
        console.log(`Deleted remaining ${count} documents from ${collectionName}.`);
      }
      
      console.log(`Collection ${collectionName} has been cleared.`);
    }
    
    console.log('All Firestore data has been cleared successfully.');
  } catch (error) {
    console.error('Error clearing Firestore data:', error);
  }
}

// Main function to run the script
async function main() {
  try {
    // Clear Firestore data
    await clearFirestoreData();
    
    // Delete all existing users
    await deleteAllUsers();
    
    // Create new test users
    await createTestUsers();
    
    console.log('User and data management completed successfully.');
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    // Terminate the Firebase Admin app
    await admin.app().delete();
  }
}

// Run the script
main();
