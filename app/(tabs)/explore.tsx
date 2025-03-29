import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';

export default function ExploreScreen() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-5xl">Explore</Text>
    </View>
  );
}
