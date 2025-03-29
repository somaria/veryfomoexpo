import { 
  getAuth, 
  signInAnonymously as firebaseSignInAnonymously, 
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  getFirestore 
} from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';

// Type for user data stored in Firestore
export interface UserData {
  uid: string;
  displayName: string | null;
  createdAt: Date;
  lastActive: Date;
}

// Sign in anonymously
export const signInAnonymously = async (): Promise<User> => {
  try {
    const result = await firebaseSignInAnonymously(auth);
    console.log('User signed in anonymously:', result.user.uid);
    
    // Create or update user document in Firestore
    await createOrUpdateUserDocument(result.user);
    
    return result.user;
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
    throw error;
  }
};

// Sign out current user
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Create or update user document in Firestore
export const createOrUpdateUserDocument = async (
  user: User,
  additionalData?: Partial<UserData>
): Promise<void> => {
  if (!user) return;

  const userRef = doc(firestore, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    // Create new user document
    const userData: any = {
      uid: user.uid,
      displayName: user.displayName || `User-${user.uid.substring(0, 5)}`,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      ...additionalData,
    };

    try {
      await setDoc(userRef, userData);
      console.log('User document created for:', user.uid);
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  } else {
    // Update existing user document
    try {
      await setDoc(userRef, {
        lastActive: serverTimestamp(),
        ...additionalData,
      }, { merge: true });
      console.log('User document updated for:', user.uid);
    } catch (error) {
      console.error('Error updating user document:', error);
    }
  }
};

// Update user display name
export const updateUserDisplayName = async (displayName: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');

  try {
    await updateProfile(user, { displayName });
    await createOrUpdateUserDocument(user, { displayName });
    console.log('Display name updated:', displayName);
  } catch (error) {
    console.error('Error updating display name:', error);
    throw error;
  }
};

// Custom hook to get and monitor authentication state
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  return { user, loading };
};
