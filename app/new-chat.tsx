import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { firestore } from './firebase';
import { useAuthContext } from './contexts/AuthContext';
import { createChat } from './services/chat';

interface User {
  uid: string;
  displayName: string;
}

export default function NewChatScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // Fetch all users except the current user
    const fetchUsers = async () => {
      if (!user) {
        console.log('No current user, cannot fetch other users');
        setLoading(false);
        return;
      }

      console.log('Current user:', user.uid, user.displayName || 'No display name');
      
      try {
        console.log('Fetching users from Firestore...');
        setLoading(true);
        
        // Create a real-time listener for users
        const usersRef = collection(firestore, 'users');
        const usersQuery = query(
          usersRef,
          orderBy('lastActive', 'desc'),
          limit(50)
        );
        
        const unsubscribe = onSnapshot(
          usersQuery,
          (snapshot) => {
            const usersList: User[] = [];
            console.log(`Found ${snapshot.size} total users in database`);
            
            snapshot.forEach(doc => {
              const userData = doc.data();
              console.log(`User data for ${doc.id}:`, userData);
              
              // Don't include the current user
              if (userData.uid !== user.uid) {
                usersList.push({
                  uid: userData.uid,
                  displayName: userData.displayName || `User-${userData.uid.substring(0, 5)}`,
                });
              }
            });
            
            console.log(`Filtered to ${usersList.length} other users (excluding current user)`);
            setUsers(usersList);
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to load users. Please try again.');
            setLoading(false);
          }
        );
        
        // Cleanup subscription
        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up users listener:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Filter users based on search query
  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Start a new chat with a user
  const startChat = async (selectedUser: User) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('You must be logged in to start a chat');
      }
      
      console.log(`Starting chat between ${user.uid} and ${selectedUser.uid}`);
      
      // Create a new chat between the current user and the selected user
      const participantIds = [user.uid, selectedUser.uid];
      const participantNames: Record<string, string> = {
        [user.uid]: user.displayName || `User-${user.uid.substring(0, 5)}`,
        [selectedUser.uid]: selectedUser.displayName,
      };
      
      console.log('Participant IDs:', participantIds);
      console.log('Participant Names:', participantNames);
      
      const chatId = await createChat(participantIds, participantNames);
      console.log('Chat created with ID:', chatId);
      
      // Navigate to the chat screen
      router.push({
        pathname: '/chat/[id]',
        params: { id: chatId }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="p-4 border-b border-gray-200 dark:border-gray-800 flex-row items-center">
        <TouchableOpacity 
          className="mr-4" 
          onPress={() => router.back()}
        >
          <Text className="text-blue-500">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 dark:text-white">New Chat</Text>
      </View>
      
      {/* Current User Info */}
      <View className="px-4 py-2 bg-gray-100 dark:bg-gray-800">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          Logged in as: {user?.displayName || `User-${user?.uid.substring(0, 8)}`}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          ID: {user?.uid}
        </Text>
      </View>
      
      {/* Search Bar */}
      <View className="p-4">
        <TextInput
          className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-gray-800 dark:text-white"
          placeholder="Search users..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* Users List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-gray-500 dark:text-gray-400 text-center">
            {searchQuery ? 'No users found matching your search.' : 'No other users available.'}
          </Text>
          <TouchableOpacity
            className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
            onPress={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1000);
            }}
          >
            <Text className="text-white">Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="p-4 border-b border-gray-200 dark:border-gray-800"
              onPress={() => startChat(item)}
            >
              <Text className="text-lg text-gray-800 dark:text-white">
                {item.displayName}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                ID: {item.uid.substring(0, 8)}...
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
