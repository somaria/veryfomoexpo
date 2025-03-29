import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuth, 
  Auth,
  onAuthStateChanged, 
  User,
  signInAnonymously,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

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
    
    // Get device ID for tracking
    const deviceId = await getDeviceId();
    
    // Merge existing data with new data
    const updatedData = {
      uid: user.uid,
      displayName: user.displayName || userData.displayName || `User-${user.uid.substring(0, 5)}`,
      email: user.email || userData.email || null,
      photoURL: user.photoURL || userData.photoURL || null,
      createdAt: userData.createdAt || serverTimestamp(),
      lastActive: serverTimestamp(),
      isAnonymous: user.isAnonymous,
      deviceId: deviceId, // Store device ID with user
      devices: userData.devices ? 
        (userData.devices.includes(deviceId) ? userData.devices : [...userData.devices, deviceId]) : 
        [deviceId],
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

// Get a unique device ID
const getDeviceId = async (): Promise<string> => {
  try {
    // Try to get stored device ID first
    const storedDeviceId = await AsyncStorage.getItem('device_id');
    if (storedDeviceId) {
      return storedDeviceId;
    }
    
    // Generate a new device ID based on device info
    let deviceId = '';
    
    // Use expo-device to get device information
    if (Device.isDevice) {
      const deviceName = Device.deviceName || '';
      const modelName = Device.modelName || '';
      const osBuildId = Device.osBuildId || '';
      
      // Create a composite ID from device properties
      deviceId = `${deviceName}-${modelName}-${osBuildId}-${Date.now()}`;
    } else {
      // For simulators or web, create a random ID
      deviceId = `simulator-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    }
    
    // Store the device ID for future use
    await AsyncStorage.setItem('device_id', deviceId);
    console.log('Generated and stored device ID:', deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a random ID if there's an error
    const fallbackId = `fallback-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    return fallbackId;
  }
};

// Find a user by device ID
const findUserByDeviceId = async (deviceId: string): Promise<string | null> => {
  try {
    console.log('Looking for existing user with device ID:', deviceId);
    
    // Query Firestore for users with this device ID
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('devices', 'array-contains', deviceId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // User found with this device ID
      const userData = querySnapshot.docs[0].data();
      console.log('Found existing user:', userData.uid);
      return userData.uid;
    }
    
    console.log('No existing user found with device ID:', deviceId);
    return null;
  } catch (error) {
    console.error('Error finding user by device ID:', error);
    return null;
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
        setLoading(false);
        return currentUser;
      }
      
      // Check if a user already exists for this device in Firestore
      const existingUserId = await findUserByDeviceId(deviceId);
      
      // Sign in anonymously - we have to do this regardless because we can't
      // directly sign in as an existing anonymous user with the client SDK
      console.log('Signing in anonymously');
      const result = await signInAnonymously(auth);
      console.log('User signed in anonymously:', result.user.uid);
      
      // Store the current auth state for recovery
      await AsyncStorage.setItem('user_auth_state', JSON.stringify({
        uid: result.user.uid,
        isAnonymous: true,
        lastLogin: new Date().toISOString(),
        deviceId: deviceId
      }));
      
      // Create or update user document in Firestore with device ID
      await createOrUpdateUserDocument(result.user, {
        devices: [deviceId]
      });
      
      // If we found an existing user for this device, log it for debugging
      if (existingUserId && existingUserId !== result.user.uid) {
        console.log('Note: Found existing user for this device:', existingUserId);
        console.log('But using new user:', result.user.uid);
        console.log('This is a limitation of Firebase anonymous auth - we cannot sign in as a specific anonymous user');
      }
      
      console.log('User document created/updated successfully after sign-in');
      setLoading(false);
      return result.user;
    } catch (error) {
      console.error('Error signing in:', error);
      // Log detailed error information
      if (error instanceof Error) {
        console.error({
          message: error.message,
          code: (error as any).code,
          stack: error.stack,
          name: error.name
        });
      }
      setLoading(false);
      return null;
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
      // Do NOT remove device_id from AsyncStorage to maintain device identity
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
