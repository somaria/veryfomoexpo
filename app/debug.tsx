import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthContext } from './contexts/AuthContext';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from './firebase';
import { useRouter } from 'expo-router';

export default function DebugScreen() {
  const { user, loading: authLoading, signIn, updateDisplayName } = useAuthContext();
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [firestoreStatus, setFirestoreStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const router = useRouter();

  // Add debug log
  const addLog = (message: string) => {
    setDebugInfo(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Test authentication
  const testAuth = async () => {
    try {
      addLog('Testing authentication...');
      if (!user) {
        addLog('No user signed in. Attempting to sign in anonymously...');
        await signIn();
        addLog('Anonymous sign-in successful!');
        
        // Update display name for easier identification
        const deviceType = Platform.OS === 'ios' ? 'iOS' : 'Android';
        const testName = `Test-${deviceType}-${Math.floor(Math.random() * 1000)}`;
        await updateDisplayName(testName);
        addLog(`Updated display name to: ${testName}`);
      } else {
        addLog(`User already signed in: ${user.uid}`);
        addLog(`Display name: ${user.displayName || 'Not set'}`);
      }
    } catch (error) {
      addLog(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test Firestore connection
  const testFirestore = async () => {
    try {
      addLog('Testing Firestore connection...');
      setFirestoreStatus('checking');
      
      // Try to get a document from Firestore
      const testRef = collection(firestore, 'users');
      const testSnapshot = await getDocs(testRef);
      
      addLog(`Firestore connected! Found ${testSnapshot.size} users.`);
      setFirestoreStatus('connected');
    } catch (error) {
      addLog(`Firestore error: ${error instanceof Error ? error.message : String(error)}`);
      setFirestoreStatus('error');
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      addLog('Fetching users...');
      setLoadingUsers(true);
      
      const usersRef = collection(firestore, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersList);
      addLog(`Found ${usersList.length} users`);
    } catch (error) {
      addLog(`Error fetching users: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Set up real-time listener for users
  useEffect(() => {
    if (user) {
      addLog('Setting up real-time listener for users...');
      
      const usersRef = collection(firestore, 'users');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsers(usersList);
        addLog(`Real-time update: ${usersList.length} users`);
      }, (error) => {
        addLog(`Listener error: ${error.message}`);
      });
      
      return () => unsubscribe();
    }
  }, [user]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>VeryFomo Debug</Text>
      
      {/* Authentication Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        {authLoading ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <Text style={styles.statusText}>
            {user ? `Signed in as: ${user.displayName || user.uid}` : 'Not signed in'}
          </Text>
        )}
        <TouchableOpacity style={styles.button} onPress={testAuth}>
          <Text style={styles.buttonText}>Test Authentication</Text>
        </TouchableOpacity>
      </View>
      
      {/* Firestore Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Firestore Status</Text>
        <Text style={styles.statusText}>
          {firestoreStatus === 'checking' && 'Checking connection...'}
          {firestoreStatus === 'connected' && 'Connected to Firestore'}
          {firestoreStatus === 'error' && 'Error connecting to Firestore'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={testFirestore}>
          <Text style={styles.buttonText}>Test Firestore</Text>
        </TouchableOpacity>
      </View>
      
      {/* Users List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Users ({users.length})</Text>
        {loadingUsers ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <View>
            {users.map((user) => (
              <View key={user.id} style={styles.userItem}>
                <Text style={styles.userName}>{user.displayName || 'No name'}</Text>
                <Text style={styles.userId}>{user.id}</Text>
                <Text style={styles.userStatus}>
                  {user.lastActive ? `Last active: ${new Date(user.lastActive.seconds * 1000).toLocaleString()}` : 'Never active'}
                </Text>
              </View>
            ))}
            <TouchableOpacity style={styles.button} onPress={fetchUsers}>
              <Text style={styles.buttonText}>Refresh Users</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Debug Logs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Logs</Text>
        <ScrollView style={styles.logContainer}>
          {debugInfo.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </ScrollView>
      </View>
      
      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.navigationButton]} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.navigationButton]} 
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.navigationButton]} 
          onPress={() => router.push('/new-chat')}
        >
          <Text style={styles.buttonText}>Go to New Chat</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Add Platform import
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userId: {
    fontSize: 12,
    color: '#666',
  },
  userStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  navigationButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
