import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from './contexts/AuthContext';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const { signIn, signInWithEmail, updateDisplayName, loading, user } = useAuthContext();
  const router = useRouter();
  const [processingLogin, setProcessingLogin] = useState(false);
  const isIOS = Platform.OS === 'ios';

  // Use useEffect for navigation instead of doing it during render
  useEffect(() => {
    if (user && !loading) {
      console.log('User already logged in, navigating to main app');
      // Use setTimeout to avoid navigation during render cycle
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
    }
  }, [user, loading, router]);

  const handleAnonymousLogin = async () => {
    if (processingLogin) return; // Prevent multiple login attempts
    
    try {
      setProcessingLogin(true);
      console.log('Starting anonymous login process');
      
      // Sign in anonymously first
      const newUser = await signIn();
      console.log('Anonymous sign-in successful, user:', newUser?.uid);
      
      if (!newUser) {
        throw new Error('Failed to sign in anonymously');
      }
      
      // Wait to ensure Firebase Auth has fully processed the sign-in
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verify user is still signed in
      const auth = getAuth();
      if (!auth.currentUser) {
        console.error('User not available after waiting period');
        throw new Error('Authentication state not stable');
      }
      
      // If username is provided, update the display name
      if (username.trim()) {
        try {
          console.log(`Updating display name to: ${username.trim()}`);
          await updateDisplayName(username.trim());
          console.log('Display name updated successfully');
          
          // Store username in AsyncStorage as backup
          await AsyncStorage.setItem('user_display_name', username.trim());
        } catch (error) {
          console.error('Error updating display name:', error);
          // Continue anyway since the user is logged in
        }
      }
      
      // Navigate to the main app
      console.log('Navigating to main app');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Error', 
        error.message || 'Failed to sign in anonymously. Please try again.'
      );
    } finally {
      setProcessingLogin(false);
    }
  };

  // Handle test user login
  const handleTestUserLogin = async (email: string, password: string, userName: string) => {
    if (processingLogin) return; // Prevent multiple login attempts
    
    try {
      setProcessingLogin(true);
      console.log(`Signing in as test user: ${email}`);
      
      // Sign in with email and password
      const signedInUser = await signInWithEmail(email, password);
      
      if (!signedInUser) {
        throw new Error('Failed to sign in with email and password');
      }
      
      console.log('Email sign-in successful, user:', signedInUser.uid);
      
      // Navigate to the main app
      console.log('Navigating to main app');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Error', 
        error.message || 'Failed to sign in. Please try again.'
      );
    } finally {
      setProcessingLogin(false);
    }
  };

  // If still loading, show loading indicator
  if (loading || processingLogin) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>
          {processingLogin ? 'Signing in...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // Don't render the login form if already logged in
  if (user) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>VeryFomo</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isIOS ? 'iPhone Test Users' : 'Android Test Users'}
          </Text>
          <Text style={styles.sectionDescription}>
            Select a test user to sign in quickly for testing purposes
          </Text>
          
          {isIOS ? (
            // iPhone test users
            <>
              <TouchableOpacity
                style={[styles.button, styles.testUserButton]}
                onPress={() => handleTestUserLogin('iphoneuser1@test.com', 'test123', 'iPhone User 1')}
                disabled={processingLogin}
              >
                <Text style={styles.buttonText}>Continue as iPhone User 1</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.testUserButton]}
                onPress={() => handleTestUserLogin('iphoneuser2@test.com', 'test123', 'iPhone User 2')}
                disabled={processingLogin}
              >
                <Text style={styles.buttonText}>Continue as iPhone User 2</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.testUserButton]}
                onPress={() => handleTestUserLogin('iphoneuser3@test.com', 'test123', 'iPhone User 3')}
                disabled={processingLogin}
              >
                <Text style={styles.buttonText}>Continue as iPhone User 3</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Android test users
            <>
              <TouchableOpacity
                style={[styles.button, styles.testUserButton]}
                onPress={() => handleTestUserLogin('androiduser1@test.com', 'test123', 'Android User 1')}
                disabled={processingLogin}
              >
                <Text style={styles.buttonText}>Continue as Android User 1</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.testUserButton]}
                onPress={() => handleTestUserLogin('androiduser2@test.com', 'test123', 'Android User 2')}
                disabled={processingLogin}
              >
                <Text style={styles.buttonText}>Continue as Android User 2</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.testUserButton]}
                onPress={() => handleTestUserLogin('androiduser3@test.com', 'test123', 'Android User 3')}
                disabled={processingLogin}
              >
                <Text style={styles.buttonText}>Continue as Android User 3</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Login</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Display Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a display name"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.guestButton]}
            onPress={handleAnonymousLogin}
            disabled={processingLogin}
          >
            <Text style={styles.buttonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#1F2937',
  },
  section: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#4B5563',
  },
  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  testUserButton: {
    backgroundColor: '#3B82F6',
  },
  guestButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
