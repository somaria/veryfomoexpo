import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useUsers } from '../services/user';
import { useAuthContext } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { checkExistingChat, createChat } from '../services/chat';

export default function ContactsScreen() {
  const { users, loading, error } = useUsers();
  const { user: currentUser } = useAuthContext();
  const router = useRouter();

  // Start a chat with a user
  const startChat = async (userId: string, displayName: string) => {
    try {
      if (!currentUser) return;

      // Check if a chat already exists
      const participantIds = [currentUser.uid, userId].sort();
      const existingChatId = await checkExistingChat(participantIds);

      if (existingChatId) {
        // Navigate to existing chat
        router.push({
          pathname: '/chat/[id]',
          params: { id: existingChatId }
        });
      } else {
        // Create a new chat
        const participantNames: Record<string, string> = {
          [currentUser.uid]: currentUser.displayName || `User-${currentUser.uid.substring(0, 5)}`,
          [userId]: displayName
        };

        const chatId = await createChat(participantIds, participantNames);
        
        // Navigate to the new chat
        router.push({
          pathname: '/chat/[id]',
          params: { id: chatId }
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  // Generate a color based on user ID for the avatar
  const getAvatarColor = (userId: string) => {
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33F0',
      '#33FFF0', '#F0FF33', '#FF3333', '#33FF33', '#3333FF'
    ];
    
    // Simple hash function to get a consistent color for a user
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Render each user item
  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => startChat(item.uid, item.displayName)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.uid) }]}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{item.displayName[0]}</Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userStatus}>
          {item.lastActive ? `Last active: ${new Date(item.lastActive).toLocaleDateString()}` : 'Tap to chat'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading contacts</Text>
          <TouchableOpacity style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            Other users will appear here when they join VeryFomo
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: '80%',
  },
});
