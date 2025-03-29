import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInAnonymously, 
  signOut as firebaseSignOut, 
  updateProfile, 
  onAuthStateChanged, 
  User,
  getAuth 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to create or update user document in Firestore
export const createOrUpdateUserDocument = async (user: User, additionalData?: Record<string, any>) => {
  if (!user) return;

  try {
    console.log(`Creating/updating user document for user: ${user.uid}`);
    const userRef = doc(firestore, 'users', user.uid);
    
    // Check if the user document already exists
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    
    // Merge existing data with new data
    const updatedData = {
      uid: user.uid,
      displayName: user.displayName || userData.displayName || `User-${user.uid.substring(0, 5)}`,
      email: user.email || userData.email || null,
      photoURL: user.photoURL || userData.photoURL || null,
      createdAt: userData.createdAt || serverTimestamp(),
      lastActive: serverTimestamp(),
      isAnonymous: user.isAnonymous,
      ...additionalData,
    };
    
    console.log('Saving user data to Firestore:', updatedData);
    await setDoc(userRef, updatedData, { merge: true });
    
    console.log('User document created/updated successfully');
    return userRef;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    console.log('Setting up auth state listener with Firebase Web SDK');
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log('Auth state changed:', authUser ? `User: ${authUser.uid}` : 'No user');
      
      if (authUser) {
        // When user signs in, update their Firestore document
        try {
          await createOrUpdateUserDocument(authUser);
        } catch (error) {
          console.error('Error updating user document on auth state change:', error);
        }
      }
      
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign in anonymously
  const signIn = async (): Promise<User | null> => {
    try {
      console.log('Attempting anonymous sign-in with Firebase Web SDK');
      setLoading(true);
      const result = await signInAnonymously(auth);
      console.log('User signed in anonymously:', result.user.uid);
      
      // Create or update user document in Firestore
      await createOrUpdateUserDocument(result.user);
      console.log('User document created/updated successfully after sign-in');
      
      // Store auth state in AsyncStorage as backup
      await AsyncStorage.setItem('user_auth_state', JSON.stringify({
        uid: result.user.uid,
        isAnonymous: true,
        lastLogin: new Date().toISOString()
      }));
      
      return result.user;
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      // Log detailed error information
      if (error instanceof Error) {
        console.error({
          message: error.message,
          code: (error as any).code,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update user display name
  const updateDisplayName = async (name: string): Promise<void> => {
    try {
      console.log(`Updating display name to: ${name}`);
      setLoading(true);
      
      // Get current auth instance and current user
      const currentAuth = getAuth();
      const currentUser = currentAuth.currentUser;
      
      if (!currentUser) {
        console.error('No user is signed in when trying to update display name');
        throw new Error('No user is signed in');
      }
      
      // Update profile in Firebase Auth
      await updateProfile(currentUser, { displayName: name });
      console.log('Firebase Auth profile updated successfully');
      
      // Update user document in Firestore
      await createOrUpdateUserDocument(currentUser, { displayName: name });
      console.log('User document updated with new display name');
      
      // Update AsyncStorage backup
      const storedUser = await AsyncStorage.getItem('user_auth_state');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.displayName = name;
        await AsyncStorage.setItem('user_auth_state', JSON.stringify(userData));
      }
      
      // Force refresh the user object
      setUser({ ...currentUser });
    } catch (error) {
      console.error('Error updating display name:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      console.log('Signing out user');
      setLoading(true);
      
      if (user) {
        // Update last active timestamp before signing out
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
        console.log('Updated last active timestamp before sign out');
      }
      
      await firebaseSignOut(auth);
      console.log('User signed out successfully');
      
      // Clear AsyncStorage backup
      await AsyncStorage.removeItem('user_auth_state');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    updateDisplayName,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Add default export
export default AuthProvider;
