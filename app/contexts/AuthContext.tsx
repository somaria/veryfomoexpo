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
    const userData = userSnap.exists() ? userSnap.data() : {};
    
    // Get device ID for tracking
    const deviceId = await getDeviceId();
    
    // Prepare data to write to Firestore
    const data: Record<string, any> = {
      displayName: user.displayName || userData.displayName || `User-${user.uid.substring(0, 5)}`,
      email: user.email || userData.email || null,
      photoURL: user.photoURL || userData.photoURL || null,
      isAnonymous: user.isAnonymous,
      lastActive: serverTimestamp(),
      ...additionalData
    };
    
    // If this is a new user or we're explicitly adding device info
    if (!userSnap.exists() || additionalData?.devices) {
      // If the user already has devices, make sure we don't duplicate them
      if (userData.devices && Array.isArray(userData.devices)) {
        // Only add the device ID if it's not already in the array
        if (!userData.devices.includes(deviceId)) {
          data.devices = [...userData.devices, deviceId];
        } else {
          data.devices = userData.devices;
        }
      } else {
        // First device for this user
        data.devices = [deviceId];
      }
    }
    
    // Write to Firestore
    await setDoc(userRef, data, { merge: true });
    console.log(`User document created/updated for ${user.uid}`);
    
    return data;
  } catch (error) {
    console.error('Error creating/updating user document:', error);
    throw error;
  }
};

// Get a unique device ID
const getDeviceId = async (): Promise<string> => {
  try {
    // Try to get stored device ID first
    const storedDeviceId = await AsyncStorage.getItem('device_id');
    if (storedDeviceId) {
      console.log('Using stored device ID:', storedDeviceId);
      return storedDeviceId;
    }
    
    // If no stored ID, generate a new one
    console.log('No stored device ID found, generating a new one');
    
    // Get device info
    const deviceName = Device.deviceName || 'unknown';
    const modelName = Device.modelName || 'unknown';
    const osName = Device.osName || 'unknown';
    const osBuildId = Device.osBuildId || 'unknown';
    
    let deviceId: string;
    
    if (Device.isDevice) {
      // For real devices, create a composite ID that should be stable
      deviceId = `${deviceName}-${modelName}-${osBuildId}`;
      console.log('Generated device ID for real device:', deviceId);
    } else {
      // For simulators, try to create a more stable ID
      // Note: Simulators may still create multiple users as their IDs can change
      deviceId = `simulator-${modelName}-${osName}-${osBuildId}`;
      console.log('Generated device ID for simulator:', deviceId);
    }
    
    // Store the device ID for future use
    await AsyncStorage.setItem('device_id', deviceId);
    console.log('Stored new device ID in AsyncStorage');
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to timestamp-based ID if all else fails
    const fallbackId = `fallback-${Date.now()}`;
    console.log('Using fallback device ID:', fallbackId);
    return fallbackId;
  }
};

// Find a user by device ID
const findUserByDeviceId = async (deviceId: string): Promise<string | null> => {
  try {
    console.log(`Looking for user with device ID: ${deviceId}`);
    
    // Query Firestore for users with this device ID
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('devices', 'array-contains', deviceId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Return the first user ID found
      const userId = querySnapshot.docs[0].id;
      console.log(`Found existing user ${userId} for device ID ${deviceId}`);
      return userId;
    }
    
    console.log(`No user found for device ID ${deviceId}`);
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

  // Update user profile photo
  const updateProfilePhoto = async (uri: string): Promise<void> => {
    try {
      console.log(`Updating profile photo with URI: ${uri}`);
      setLoading(true);
      
      // Get current auth instance and current user
      const currentAuth = getAuth();
      const currentUser = currentAuth.currentUser;
      
      if (!currentUser) {
        console.error('No user is signed in when trying to update profile photo');
        throw new Error('No user is signed in');
      }
      
      // Convert image URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a storage reference
      const storageRef = ref(storage, `profile_photos/${currentUser.uid}`);
      
      // Upload the image
      console.log('Uploading image to Firebase Storage...');
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Image uploaded successfully, download URL:', downloadURL);
      
      // Update profile in Firebase Auth
      await updateProfile(currentUser, { photoURL: downloadURL });
      console.log('Firebase Auth profile updated with new photo URL');
      
      // Update user document in Firestore
      await createOrUpdateUserDocument(currentUser, { photoURL: downloadURL });
      console.log('User document updated with new photo URL');
      
      // Update AsyncStorage backup
      const storedUser = await AsyncStorage.getItem('user_auth_state');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.photoURL = downloadURL;
        await AsyncStorage.setItem('user_auth_state', JSON.stringify(userData));
      }
      
      // Force refresh the user object
      setUser({ ...currentUser });
    } catch (error) {
      console.error('Error updating profile photo:', error);
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
    signInWithEmail,
    signOut,
    updateDisplayName,
    updateProfilePhoto,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Add default export
export default AuthProvider;
