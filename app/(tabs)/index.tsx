import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet, Alert, Platform, Button, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useChats } from '../services/chat';
import { Ionicons } from '@expo/vector-icons';

export default function ChatsScreen() {
  const { user, loading: authLoading } = useAuthContext();
  const { chats, loading: chatsLoading, error } = useChats();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Manual refresh function to replace router.reload()
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Force component to re-render and fetch data again
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Navigate to chat screen
  const navigateToChat = (chatId: string) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: chatId }
    });
  };

  // Navigate to new chat screen
  const navigateToNewChat = () => {
    router.push('/new-chat');
  };

  // Format date for last message
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today, show time
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week, show day name
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      // Older, show date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Get other participant's name
  const getOtherParticipantName = (chat: any) => {
    if (!user || !chat.participantNames) return 'Unknown';
    
    const otherParticipantId = chat.participants.find((id: string) => id !== user.uid);
    if (otherParticipantId) {
      return chat.participantNames[otherParticipantId] || `User-${otherParticipantId.substring(0, 5)}`;
    }
    
    return 'Chat';
  };

  if (authLoading || chatsLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text className="text-2xl font-bold text-gray-800 dark:text-white">Chats</Text>
          {user && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {user.displayName || `User-${user.uid.substring(0, 5)}`}
            </Text>
          )}
        </View>
        {/* New Chat Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={navigateToNewChat}
          activeOpacity={0.6}
        >
          <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      {error ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 mb-4">Error loading chats</Text>
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg"
            onPress={handleRefresh}
          >
            <Text className="text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : chats.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
            No chats yet. Start a new conversation!
          </Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg"
            onPress={navigateToNewChat}
          >
            <Text className="text-white font-bold">New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id || ''}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="p-4 border-b border-gray-200 dark:border-gray-800"
              onPress={() => navigateToChat(item.id || '')}
            >
              <View className="flex-row justify-between">
                <Text className="text-lg font-semibold text-gray-800 dark:text-white">
                  {getOtherParticipantName(item)}
                </Text>
                {item.lastMessage && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(item.lastMessage.createdAt)}
                  </Text>
                )}
              </View>
              {item.lastMessage && (
                <Text 
                  className="text-gray-500 dark:text-gray-400 mt-1"
                  numberOfLines={1}
                >
                  {item.lastMessage.senderId === 'system' 
                    ? <Text className="italic">{item.lastMessage.text}</Text>
                    : item.lastMessage.senderId === user?.uid
                      ? `You: ${item.lastMessage.text}`
                      : item.lastMessage.text
                  }
                </Text>
              )}
            </TouchableOpacity>
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Floating Action Button for New Chat */}
      {chats.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToNewChat}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
