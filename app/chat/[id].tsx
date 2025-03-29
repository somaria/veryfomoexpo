import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useMessages, sendMessage } from '../services/chat';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatDetails {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  console.log('Chat screen received params:', params);
  console.log('Chat ID from params:', id);
  
  const { user, loading: authLoading } = useAuthContext();
  const { messages, loading: messagesLoading } = useMessages(id);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Fetch chat details
  useEffect(() => {
    const fetchChatDetails = async () => {
      try {
        if (!id) {
          console.error('No chat ID provided in params');
          setError('No chat ID provided');
          setLoading(false);
          return;
        }
        
        if (!user) {
          console.error('User not authenticated');
          setLoading(false);
          return;
        }
        
        console.log('Fetching chat details for ID:', id);
        const chatRef = doc(firestore, 'chats', id);
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
          console.log('Chat document exists:', chatDoc.id);
          const data = chatDoc.data();
          console.log('Chat data:', data);
          setChatDetails({
            id: chatDoc.id,
            ...data,
          } as ChatDetails);
        } else {
          console.error('Chat document does not exist for ID:', id);
          setError('Chat not found');
        }
      } catch (error) {
        console.error('Error fetching chat details:', error);
        setError('Error loading chat');
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchChatDetails();
    }
  }, [id, user]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !id || !user) return;
    
    try {
      setSending(true);
      await sendMessage(id, messageText.trim());
      setMessageText('');
      
      // Scroll to the bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Format message timestamp
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format message date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get chat title (other participant's name for 1:1 chats)
  const getChatTitle = () => {
    if (!chatDetails || !user) return 'Chat';
    
    // For 1:1 chats, show the other participant's name
    const otherParticipantId = chatDetails.participants.find(id => id !== user.uid);
    if (otherParticipantId) {
      return chatDetails.participantNames[otherParticipantId] || 'Chat';
    }
    
    return 'Group Chat';
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: any[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatDate(message.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs,
    }));
  };

  // Show loading indicator while authentication is in progress
  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4 text-gray-500">Checking authentication...</Text>
      </SafeAreaView>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  if (loading || messagesLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center p-4">
        <Text className="text-lg text-gray-800 dark:text-white mb-4">{error}</Text>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ paddingBottom: 0 }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="flex-1 bg-white dark:bg-gray-900">
          {/* Header */}
          <View className="p-4 border-b border-gray-200 dark:border-gray-800 flex-row items-center">
            <TouchableOpacity 
              className="mr-4" 
              onPress={() => router.back()}
            >
              <Text className="text-blue-500">Back</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800 dark:text-white">
                {getChatTitle()}
              </Text>
              {user && (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Your ID: {user.uid.substring(0, 8)}...
                </Text>
              )}
            </View>
          </View>
          
          {/* Messages */}
          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center p-4">
              <Text className="text-gray-500 dark:text-gray-400 text-center">
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              className="flex-1 p-4"
              data={messages}
              inverted
              keyExtractor={(item) => item.id || `${item.createdAt}-${item.senderId}`}
              renderItem={({ item }) => {
                const isCurrentUser = item.senderId === user?.uid;
                
                return (
                  <View className={`mb-4 max-w-[80%] ${isCurrentUser ? 'self-end' : 'self-start'}`}>
                    {!isCurrentUser && (
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
                        {item.senderName || `User-${item.senderId.substring(0, 5)}`}
                      </Text>
                    )}
                    <View 
                      className={`p-3 rounded-lg ${
                        isCurrentUser 
                          ? 'bg-blue-500 rounded-tr-none' 
                          : 'bg-gray-200 dark:bg-gray-700 rounded-tl-none'
                      }`}
                    >
                      <Text 
                        className={`${
                          isCurrentUser ? 'text-white' : 'text-gray-800 dark:text-white'
                        }`}
                      >
                        {item.text}
                      </Text>
                    </View>
                    <View className={`flex-row ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 mx-2">
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
          
          {/* Message Input */}
          <View 
            className="p-2 border-t border-gray-200 dark:border-gray-800 flex-row items-center"
            style={{ 
              paddingBottom: Math.max(insets.bottom, 8) 
            }}
          >
            <TextInput
              className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-gray-800 dark:text-white mr-2"
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              autoFocus={false}
            />
            <TouchableOpacity
              className={`p-3 rounded-full ${
                !messageText.trim() || sending ? 'bg-gray-300 dark:bg-gray-700' : 'bg-blue-500'
              }`}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold">Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
