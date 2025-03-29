import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInAnonymously, 
  signOut as firebaseSignOut, 
  updateProfile, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
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
    const userRef = doc(firestore, 'users', user.uid);
    
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || `User-${user.uid.substring(0, 5)}`,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      ...additionalData,
    }, { merge: true });
    
    console.log('User document created/updated successfully');
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
    
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log('Auth state changed:', authUser ? `User: ${authUser.uid}` : 'No user');
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign in anonymously
  const signIn = async (): Promise<void> => {
    try {
      console.log('Attempting anonymous sign-in with Firebase Web SDK');
      setLoading(true);
      const { user } = await signInAnonymously(auth);
      console.log('User signed in anonymously:', user.uid);
      
      // Create or update user document in Firestore
      await createOrUpdateUserDocument(user);
      console.log('User document created/updated successfully');
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

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      console.log('Attempting to sign out');
      await firebaseSignOut(auth);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign-out error:', error);
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
    }
  };

  // Update display name
  const updateDisplayName = async (name: string): Promise<void> => {
    if (!user) {
      console.error('Cannot update display name: No user is signed in');
      throw new Error('No user is signed in');
    }

    try {
      console.log(`Updating display name to: ${name}`);
      await updateProfile(user, { displayName: name });
      await createOrUpdateUserDocument(user, { displayName: name });
      console.log('Display name updated successfully');
    } catch (error) {
      console.error('Error updating display name:', error);
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
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    updateDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
