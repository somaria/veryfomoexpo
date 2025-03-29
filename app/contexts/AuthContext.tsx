import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuth, 
  Auth,
  onAuthStateChanged, 
  User,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateProfilePhoto: (uri: string) => Promise<void>;
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
    
    // Get the current timestamp
    const timestamp = serverTimestamp();
    
    if (userSnap.exists()) {
      console.log(`User document exists, updating: ${user.uid}`);
      const userData = userSnap.data();
      
      // Update the existing document
      await setDoc(userRef, {
        ...userData,
        displayName: user.displayName || userData.displayName || `User-${user.uid.substring(0, 5)}`,
        email: user.email || userData.email || null,
        photoURL: user.photoURL || userData.photoURL || null,
        lastActive: timestamp,
        ...additionalData
      }, { merge: true });
      
      console.log(`Updated user document for: ${user.uid}`);
    } else {
      console.log(`User document does not exist, creating new: ${user.uid}`);
      
      // Create a new document
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || `User-${user.uid.substring(0, 5)}`,
        email: user.email || null,
        photoURL: user.photoURL || null,
        createdAt: timestamp,
        lastActive: timestamp,
        ...additionalData
      });
      
      console.log(`Created new user document for: ${user.uid}`);
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error);
    throw error;
  }
};

// Get a unique device ID
export const getDeviceId = async (): Promise<string> => {
  try {
    // Try to get the stored device ID first
    const storedDeviceId = await AsyncStorage.getItem('device_id');
    
    if (storedDeviceId) {
      console.log('Using stored device ID:', storedDeviceId);
      return storedDeviceId;
    }
    
    // Generate a new device ID based on device information
    let deviceInfo = '';
    
    // Get device brand
    if (Device.brand) {
      deviceInfo += Device.brand;
    }
    
    // Get device model
    if (Device.modelName) {
      deviceInfo += `-${Device.modelName}`;
    }
    
    // Get device OS
    if (Device.osName) {
      deviceInfo += `-${Device.osName}`;
    }
    
    // If we couldn't get any device info, use a timestamp
    if (!deviceInfo) {
      deviceInfo = `device-${Date.now()}`;
    }
    
    // Add a random component to ensure uniqueness
    const randomComponent = Math.random().toString(36).substring(2, 10);
    const deviceId = `${deviceInfo}-${randomComponent}`;
    
    // Store the device ID for future use
    await AsyncStorage.setItem('device_id', deviceId);
    
    console.log('Generated and stored new device ID:', deviceId);
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a timestamp-based ID
    const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    console.log('Using fallback device ID:', fallbackId);
    return fallbackId;
  }
};

// Find a user by device ID
export const findUserByDeviceId = async (deviceId: string): Promise<string | null> => {
  try {
    console.log(`Looking for user with device ID: ${deviceId}`);
    
    // Query Firestore for users with this device ID
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('devices', 'array-contains', deviceId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Get the first user that matches
      const userId = querySnapshot.docs[0].id;
      console.log(`Found user with ID: ${userId} for device ID: ${deviceId}`);
      return userId;
    }
    
    console.log(`No user found for device ID: ${deviceId}`);
    return null;
  } catch (error) {
    console.error('Error finding user by device ID:', error);
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored authentication state on startup
  useEffect(() => {
    const checkStoredAuthState = async () => {
      try {
        // First check if Firebase already has a current user
        if (auth.currentUser) {
          console.log('Firebase already has a current user:', auth.currentUser.uid);
          setUser(auth.currentUser);
          setLoading(false);
          return;
        }
        
        // If no current user in Firebase, check AsyncStorage
        const storedAuthState = await AsyncStorage.getItem('user_auth_state');
        
        if (storedAuthState) {
          console.log('Found stored auth state in AsyncStorage');
          // We found stored auth state, but we can't directly restore it
          // We'll wait for Firebase's onAuthStateChanged to fire
          // If it doesn't detect a user, we'll clear the stored state
          console.log('Waiting for Firebase Auth to initialize...');
        } else {
          console.log('No stored auth state and no current user');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking stored auth state:', error);
        setLoading(false);
      }
    };
    
    checkStoredAuthState();
  }, []);

  useEffect(() => {
    // Subscribe to auth state changes
    console.log('Setting up auth state listener with Firebase Web SDK');
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log('Auth state changed:', authUser ? `User: ${authUser.uid}` : 'No user');
      
      if (authUser) {
        // When user signs in, update their Firestore document
        try {
          await createOrUpdateUserDocument(authUser, {
            lastLogin: serverTimestamp()
          });
          
          // Store auth state in AsyncStorage for backup
          await AsyncStorage.setItem('user_auth_state', JSON.stringify({
            uid: authUser.uid,
            displayName: authUser.displayName,
            email: authUser.email,
            isAnonymous: authUser.isAnonymous,
            lastLogin: new Date().toISOString()
          }));
          
          console.log('Stored auth state in AsyncStorage');
        } catch (error) {
          console.error('Error updating user document on auth state change:', error);
        }
      } else {
        // Check if we have stored auth state but Firebase doesn't recognize the user
        const storedAuthState = await AsyncStorage.getItem('user_auth_state');
        if (storedAuthState) {
          console.log('Firebase reports no user, but we have stored auth state');
          console.log('Clearing stored auth state to maintain consistency');
          await AsyncStorage.removeItem('user_auth_state');
          console.log('Cleared stored auth state in AsyncStorage');
        }
      }
      
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign in anonymously, using device ID to maintain consistent user identity
  const signIn = async (): Promise<User | null> => {
    try {
      console.log('Starting sign-in process with device ID tracking');
      setLoading(true);
      
      // Get the device ID
      const deviceId = await getDeviceId();
      console.log('Device ID for authentication:', deviceId);
      
      // Check if we already have a user signed in
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('User already signed in:', currentUser.uid);
        // Update the user document to ensure device ID is associated
        await createOrUpdateUserDocument(currentUser, {
          devices: [deviceId]
        });
        return currentUser;
      }
      
      // Try to find an existing user for this device
      const existingUserId = await findUserByDeviceId(deviceId);
      
      if (existingUserId) {
        console.log(`Found existing user (${existingUserId}) for this device, but cannot sign in as them directly with anonymous auth`);
        console.log('Creating a new anonymous user and linking to the existing device ID');
      } else {
        console.log('No existing user found for this device, creating a new anonymous user');
      }
      
      // Create a new anonymous user
      // Note: With Firebase anonymous auth, we can't sign in as a specific anonymous user
      // We can only create new ones and track them via device ID in Firestore
      const { user: newUser } = await signInAnonymously(auth);
      console.log(`Created new anonymous user: ${newUser.uid}`);
      
      // Update the user document with the device ID
      await createOrUpdateUserDocument(newUser, {
        devices: [deviceId]
      });
      
      return newUser;
    } catch (error) {
      console.error('Error signing in:', error);
      setLoading(false);
      throw error;
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
      console.log(`Signing in with email: ${email}`);
      setLoading(true);
      
      // Sign in with email and password
      const { user: signedInUser } = await signInWithEmailAndPassword(auth, email, password);
      console.log(`Signed in successfully as: ${signedInUser.uid}`);
      
      // Get the device ID
      const deviceId = await getDeviceId();
      
      // Update the user document with the device ID
      await createOrUpdateUserDocument(signedInUser, {
        devices: [deviceId],
        lastLogin: serverTimestamp()
      });
      
      return signedInUser;
    } catch (error) {
      console.error('Error signing in with email:', error);
      setLoading(false);
      throw error;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      console.log('Signing out...');
      
      // Update the user's last active timestamp before signing out
      if (user) {
        try {
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, {
            lastActive: serverTimestamp()
          }, { merge: true });
          console.log(`Updated last active timestamp for user: ${user.uid}`);
        } catch (error) {
          console.error('Error updating last active timestamp:', error);
        }
      }
      
      // Clear stored auth state
      await AsyncStorage.removeItem('user_auth_state');
      console.log('Cleared stored auth state');
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      console.log('Signed out from Firebase');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Update display name
  const updateDisplayName = async (name: string): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No user is signed in');
      }
      
      console.log(`Updating display name to: ${name}`);
      
      // Update the profile in Firebase Auth
      await updateProfile(user, { displayName: name });
      
      // Update the user document in Firestore
      await createOrUpdateUserDocument(user, { displayName: name });
      
      console.log('Display name updated successfully');
    } catch (error) {
      console.error('Error updating display name:', error);
      throw error;
    }
  };

  // Update profile photo
  const updateProfilePhoto = async (uri: string): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No user is signed in');
      }
      
      console.log(`Updating profile photo with URI: ${uri}`);
      
      // Create a reference to the storage location
      const storageRef = ref(storage, `profile_photos/${user.uid}`);
      
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, blob);
      console.log('Profile photo uploaded successfully');
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`Profile photo URL: ${downloadURL}`);
      
      // Update the profile in Firebase Auth
      await updateProfile(user, { photoURL: downloadURL });
      
      // Update the user document in Firestore
      await createOrUpdateUserDocument(user, { photoURL: downloadURL });
      
      console.log('Profile photo updated successfully');
    } catch (error) {
      console.error('Error updating profile photo:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signInWithEmail,
        signOut,
        updateDisplayName,
        updateProfilePhoto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Add default export
export default AuthProvider;
