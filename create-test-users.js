const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount)
});

// Create test users
const createTestUsers = async () => {
  const auth = getAuth();
  
  const testUsers = [
    { email: 'user1@test.com', password: 'test123', displayName: 'User 1' },
    { email: 'user2@test.com', password: 'test123', displayName: 'User 2' },
    { email: 'user3@test.com', password: 'test123', displayName: 'User 3' }
  ];
  
  for (const user of testUsers) {
    try {
      // Check if user already exists
      try {
        const userRecord = await auth.getUserByEmail(user.email);
        console.log(`User ${user.email} already exists with UID: ${userRecord.uid}`);
        
        // Update display name if needed
        await auth.updateUser(userRecord.uid, {
          displayName: user.displayName
        });
        console.log(`Updated display name for ${user.email} to ${user.displayName}`);
      } catch (error) {
        // User doesn't exist, create new user
        if (error.code === 'auth/user-not-found') {
          const userRecord = await auth.createUser({
            email: user.email,
            password: user.password,
            displayName: user.displayName,
            emailVerified: true
          });
          console.log(`Created new user ${user.email} with UID: ${userRecord.uid}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error handling user ${user.email}:`, error);
    }
  }
  
  console.log('Test users setup complete!');
};

createTestUsers().catch(console.error);
