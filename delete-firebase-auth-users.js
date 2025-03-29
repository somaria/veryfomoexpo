/**
 * VeryFomo Firebase Auth Users Cleanup Script
 * 
 * This script will delete all users from Firebase Authentication.
 * IMPORTANT: This requires Firebase Admin SDK and service account credentials.
 * 
 * To use this script:
 * 1. Download your Firebase service account key from:
 *    Firebase Console > Project Settings > Service Accounts > Generate New Private Key
 * 2. Save the JSON file as 'serviceAccountKey.json' in this directory
 * 3. Run: node delete-firebase-auth-users.js
 */

const admin = require('firebase-admin');

// You'll need to download the service account key from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
try {
  // Initialize Firebase Admin with service account
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error.message);
  console.log('\nMake sure you have downloaded the service account key from Firebase Console:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate New Private Key"');
  console.log('3. Save the JSON file as "serviceAccountKey.json" in this directory');
  process.exit(1);
}

// Function to list and delete all users
async function deleteAllUsers() {
  console.log('Starting Firebase Auth users cleanup...');
  
  try {
    // Get list of users (up to 1000 at a time)
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;
    
    if (users.length === 0) {
      console.log('No users found in Firebase Authentication.');
      return 0;
    }
    
    console.log(`Found ${users.length} users in Firebase Authentication.`);
    
    // Delete each user
    const deletePromises = users.map(async (userRecord) => {
      console.log(`Deleting user: ${userRecord.uid} (${userRecord.email || 'anonymous'})`);
      return admin.auth().deleteUser(userRecord.uid);
    });
    
    await Promise.all(deletePromises);
    
    console.log(`Successfully deleted ${users.length} users from Firebase Authentication.`);
    return users.length;
  } catch (error) {
    console.error('Error deleting users:', error);
    throw error;
  }
}

// Run the cleanup
deleteAllUsers()
  .then((count) => {
    console.log(`Cleanup complete. Deleted ${count} users in total.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error during cleanup:', error);
    process.exit(1);
  });
