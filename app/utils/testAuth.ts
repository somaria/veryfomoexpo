import { 
  signInAnonymously, 
  updateProfile 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, firestore } from '../firebase';

/**
 * Utility function to create a test user with anonymous authentication
 * @param displayName Optional display name for the test user
 * @returns The created user's UID and display name
 */
export const createTestUser = async (displayName?: string): Promise<{ uid: string; displayName: string }> => {
  try {
    // Sign in anonymously
    const result = await signInAnonymously(auth);
    const user = result.user;
    console.log('Created test user with UID:', user.uid);
    
    // Generate a display name if not provided
    const userName = displayName || `TestUser-${Math.floor(Math.random() * 10000)}`;
    
    // Update user profile with display name
    await updateProfile(user, { displayName: userName });
    
    // Create user document in Firestore
    const userRef = doc(firestore, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: userName,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    });
    
    console.log('User document created for:', userName);
    
    return {
      uid: user.uid,
      displayName: userName,
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

/**
 * Utility function to create a test chat between two users
 * @param user1Id First user's UID
 * @param user1Name First user's display name
 * @param user2Id Second user's UID
 * @param user2Name Second user's display name
 * @returns The created chat's ID
 */
export const createTestChat = async (
  user1Id: string,
  user1Name: string,
  user2Id: string,
  user2Name: string
): Promise<string> => {
  try {
    // Create participant IDs array (sorted for consistency)
    const participantIds = [user1Id, user2Id].sort();
    
    // Create participant names record
    const participantNames: Record<string, string> = {
      [user1Id]: user1Name,
      [user2Id]: user2Name,
    };
    
    // Check if chat already exists
    const chatsRef = collection(firestore, 'chats');
    const q = query(chatsRef, where('participants', '==', participantIds));
    const existingChatsQuery = await getDocs(q);
    
    if (!existingChatsQuery.empty) {
      const chatId = existingChatsQuery.docs[0].id;
      console.log('Using existing chat with ID:', chatId);
      return chatId;
    }
    
    // Create new chat
    const chatData = {
      participants: participantIds,
      participantNames,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const chatRef = await addDoc(collection(firestore, 'chats'), chatData);
    
    console.log('Created test chat with ID:', chatRef.id);
    return chatRef.id;
  } catch (error) {
    console.error('Error creating test chat:', error);
    throw error;
  }
};

/**
 * Utility function to send a test message in a chat
 * @param chatId Chat ID
 * @param senderId Sender's UID
 * @param senderName Sender's display name
 * @param text Message text
 */
export const sendTestMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> => {
  try {
    // Add message to messages collection
    const messageData = {
      chatId,
      senderId,
      senderName,
      text,
      createdAt: serverTimestamp(),
    };
    
    await addDoc(collection(firestore, 'messages'), messageData);
    
    // Update chat's last message and updatedAt
    const chatRef = doc(firestore, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text,
        createdAt: serverTimestamp(),
        senderId,
      },
      updatedAt: serverTimestamp(),
    });
    
    console.log('Sent test message:', text);
  } catch (error) {
    console.error('Error sending test message:', error);
    throw error;
  }
};
