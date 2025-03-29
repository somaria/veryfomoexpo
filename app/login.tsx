import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from './contexts/AuthContext';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const { signIn, updateDisplayName, loading, user } = useAuthContext();
  const router = useRouter();
  const [processingLogin, setProcessingLogin] = useState(false);

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

  // If still loading, show loading indicator
  if (loading || processingLogin) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4 text-gray-600">
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
    <View className="flex-1 items-center justify-center p-6 bg-white dark:bg-gray-900">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">VeryFomo</Text>
      
      <View className="w-full mb-6">
        <Text className="text-gray-600 dark:text-gray-300 mb-2">Display Name (Optional)</Text>
        <TextInput
          className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-gray-800 dark:text-white"
          placeholder="Enter a display name"
          placeholderTextColor="#9CA3AF"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>
      
      <TouchableOpacity
        className="w-full bg-blue-500 p-4 rounded-lg items-center"
        onPress={handleAnonymousLogin}
        disabled={loading || processingLogin}
      >
        {loading || processingLogin ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold text-lg">Continue as Guest</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
