import { collection, query, where, orderBy, addDoc, updateDoc, doc, onSnapshot, getDocs, limit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firestore } from '../firebase';
import { auth } from '../firebase';

// Message interface
export interface Message {
  id?: string;
  text: string;
  createdAt: Date;
  senderId: string;
  senderName: string;
  chatId: string;
}

// Chat interface
export interface Chat {
  id?: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage?: {
    text: string;
    createdAt: Date;
    senderId: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Check if chat exists between participants
export const checkExistingChat = async (participantIds: string[]): Promise<string | null> => {
  try {
    // Sort participant IDs to ensure consistent chat ID generation
    const sortedParticipantIds = [...participantIds].sort();
    
    // Query for existing chat
    const chatsRef = collection(firestore, 'chats');
    const q = query(
      chatsRef, 
      where('participants', '==', sortedParticipantIds),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const chatDoc = querySnapshot.docs[0];
      console.log('Found existing chat:', chatDoc.id);
      return chatDoc.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error checking for existing chat:', error);
    return null;
  }
};

// Create a new chat between users
export const createChat = async (
  participantIds: string[],
  participantNames: Record<string, string>
): Promise<string> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('No user is signed in');

    console.log('Creating chat with participants:', participantIds);
    console.log('Participant names:', participantNames);

    // Make sure the current user is included in participants
    if (!participantIds.includes(currentUser.uid)) {
      participantIds.push(currentUser.uid);
      participantNames[currentUser.uid] = currentUser.displayName || `User-${currentUser.uid.substring(0, 5)}`;
    }

    // Sort participant IDs to ensure consistent chat ID generation
    const sortedParticipantIds = [...participantIds].sort();

    // Check if chat already exists between these participants
    const existingChatId = await checkExistingChat(sortedParticipantIds);
    if (existingChatId) {
      console.log('Chat already exists, returning existing chat ID:', existingChatId);
      return existingChatId;
    }
    
    // Create new chat document
    const now = new Date();
    const chatData: Chat = {
      participants: sortedParticipantIds,
      participantNames,
      createdAt: now,
      updatedAt: now,
    };

    const chatRef = await addDoc(collection(firestore, 'chats'), chatData);
    console.log('New chat created with ID:', chatRef.id);
    
    // Send a system message to indicate chat creation
    const welcomeMessage = {
      text: 'Chat created. Say hello!',
      createdAt: now,
      senderId: 'system',
      senderName: 'System',
      chatId: chatRef.id,
    };
    
    await addDoc(collection(firestore, 'messages'), welcomeMessage);
    
    return chatRef.id;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

// Send a message to a chat
export const sendMessage = async (chatId: string, text: string): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('No user is signed in');

    console.log(`Sending message to chat ${chatId}: "${text}"`);
    
    const now = new Date();
    const messageData: Message = {
      text,
      createdAt: now,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || `User-${currentUser.uid.substring(0, 5)}`,
      chatId,
    };

    // Add message to the messages collection
    const messageRef = await addDoc(collection(firestore, 'messages'), messageData);
    console.log('Message added with ID:', messageRef.id);

    // Update the chat's last message and updatedAt
    await updateDoc(doc(firestore, 'chats', chatId), {
      lastMessage: {
        text,
        createdAt: now,
        senderId: currentUser.uid,
      },
      updatedAt: now,
    });

    console.log('Chat updated with last message');
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get all chats for the current user
export const useChats = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.log('No user is signed in, cannot fetch chats');
      setLoading(false);
      return () => {};
    }

    console.log('Fetching chats for user:', currentUser.uid);

    const chatsRef = collection(firestore, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatList: Chat[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamps to JavaScript Date objects
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
          const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt);
          
          let lastMessage = undefined;
          if (data.lastMessage) {
            const lastMessageCreatedAt = data.lastMessage.createdAt instanceof Timestamp 
              ? data.lastMessage.createdAt.toDate() 
              : new Date(data.lastMessage.createdAt);
            
            lastMessage = {
              ...data.lastMessage,
              createdAt: lastMessageCreatedAt
            };
          }
          
          chatList.push({
            id: doc.id,
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            lastMessage,
            createdAt,
            updatedAt
          });
        });
        
        console.log(`Fetched ${chatList.length} chats`);
        setChats(chatList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching chats:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return { chats, loading, error };
};

// Get messages for a specific chat
export const useMessages = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!chatId) {
      console.log('No chat ID provided, cannot fetch messages');
      setLoading(false);
      return () => {};
    }

    console.log(`Fetching messages for chat: ${chatId}`);

    const messagesRef = collection(firestore, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageList: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamp to JavaScript Date
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt);
          
          messageList.push({
            id: doc.id,
            text: data.text || '',
            createdAt,
            senderId: data.senderId || '',
            senderName: data.senderName || `User-${data.senderId?.substring(0, 5) || 'unknown'}`,
            chatId: data.chatId || '',
          });
        });
        
        console.log(`Fetched ${messageList.length} messages for chat ${chatId}`);
        setMessages(messageList);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching messages for chat ${chatId}:`, err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [chatId]);

  return { messages, loading, error };
};

// Collection of chat services
const chatServices = {
  getCurrentUser,
  checkExistingChat,
  createChat,
  sendMessage,
  useChats,
  useMessages
};

// Add default export
export default chatServices;
