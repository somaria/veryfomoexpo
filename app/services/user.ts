import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firestore } from '../firebase';
import { auth } from '../firebase';

// User interface
export interface User {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  lastActive?: Date;
  deviceId?: string;
  devices?: string[];
}

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        uid: userDoc.id,
        displayName: userData.displayName || `User-${userDoc.id.substring(0, 5)}`,
        email: userData.email || null,
        photoURL: userData.photoURL || null,
        isAnonymous: userData.isAnonymous || true,
        lastActive: userData.lastActive ? userData.lastActive.toDate() : new Date(),
        deviceId: userData.deviceId,
        devices: userData.devices || [],
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

// Hook to get all users
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setUsers([]);
      return () => {};
    }

    setLoading(true);
    
    try {
      // Query all users, ordered by display name
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, orderBy('displayName'));
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const usersList: User[] = [];
          
          snapshot.forEach((doc) => {
            const userData = doc.data();
            
            // Don't include the current user in the list
            if (doc.id !== currentUser?.uid) {
              usersList.push({
                uid: doc.id,
                displayName: userData.displayName || `User-${doc.id.substring(0, 5)}`,
                email: userData.email || null,
                photoURL: userData.photoURL || null,
                isAnonymous: userData.isAnonymous || true,
                lastActive: userData.lastActive ? userData.lastActive.toDate() : new Date(),
                deviceId: userData.deviceId,
                devices: userData.devices || [],
              });
            }
          });
          
          setUsers(usersList);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching users:', err);
          setError(err as Error);
          setLoading(false);
        }
      );
      
      // Clean up listener on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up users listener:', err);
      setError(err as Error);
      setLoading(false);
      return () => {};
    }
  }, [currentUser]);

  return { users, loading, error };
};

// Collection of user services
const userServices = {
  getCurrentUser,
  getUserById,
  useUsers,
};

export default userServices;
