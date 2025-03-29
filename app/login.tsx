import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from './contexts/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const { signIn, updateDisplayName, loading, user } = useAuthContext();
  const router = useRouter();

  const handleAnonymousLogin = async () => {
    try {
      console.log('Starting anonymous login process');
      
      // Sign in anonymously
      await signIn();
      console.log('Anonymous sign-in successful');
      
      // If username is provided, update the display name
      if (username.trim()) {
        console.log(`Updating display name to: ${username.trim()}`);
        await updateDisplayName(username.trim());
        console.log('Display name updated successfully');
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
    }
  };

  // If user is already logged in, redirect to main app
  if (user && !loading) {
    console.log('User already logged in, redirecting to main app');
    router.replace('/(tabs)');
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
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold text-lg">Continue as Guest</Text>
        )}
      </TouchableOpacity>
      
      <Text className="mt-6 text-gray-500 dark:text-gray-400 text-center">
        This will create an anonymous account for testing purposes.
      </Text>
    </View>
  );
}
