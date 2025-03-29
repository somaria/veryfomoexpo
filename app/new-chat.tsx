import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
      try {
        const usersRef = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersList: User[] = [];
        
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          // Don't include the current user
          if (userData.uid !== user?.uid) {
            usersList.push({
              uid: userData.uid,
              displayName: userData.displayName || `User-${userData.uid.substring(0, 5)}`,
            });
          }
        });
        
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
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
      
      // Create a new chat between the current user and the selected user
      const participantIds = [user.uid, selectedUser.uid];
      const participantNames: Record<string, string> = {
        [user.uid]: user.displayName || `User-${user.uid.substring(0, 5)}`,
        [selectedUser.uid]: selectedUser.displayName,
      };
      
      const chatId = await createChat(participantIds, participantNames);
      
      // Navigate to the chat screen
      router.push({
        pathname: '/chat/[id]',
        params: { id: chatId }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
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
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
