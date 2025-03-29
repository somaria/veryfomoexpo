import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user, signOut, updateDisplayName } = useAuthContext();
  const router = useRouter();
  const [newUsername, setNewUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSignOut = async () => {
    try {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Attempting to sign out...');
                await signOut();
                console.log('Sign out successful, navigating to login');
                router.replace('/login');
              } catch (error) {
                console.error('Error signing out:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error showing sign out alert:', error);
    }
  };

  // Force navigation to login screen (backup method for iOS)
  const forceNavigateToLogin = () => {
    router.replace('/login');
  };

  // Handle username update
  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    try {
      setIsUpdating(true);
      await updateDisplayName(newUsername.trim());
      setIsEditing(false);
      setNewUsername('');
      Alert.alert('Success', 'Username updated successfully');
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert('Error', 'Failed to update username. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Start editing username
  const startEditingUsername = () => {
    setNewUsername(user?.displayName || '');
    setIsEditing(true);
  };

  // Cancel editing username
  const cancelEditingUsername = () => {
    setIsEditing(false);
    setNewUsername('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      {user && (
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.displayName?.[0] || user.uid[0]}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.displayName || 'Anonymous User'}</Text>
            <Text style={styles.userId}>ID: {user.uid}</Text>
          </View>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        
        {isEditing ? (
          <View style={styles.editUsernameContainer}>
            <TextInput
              style={styles.usernameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
            <View style={styles.editButtonsRow}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.editButton, styles.saveButton]} 
                    onPress={handleUpdateUsername}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editButton, styles.cancelButton]} 
                    onPress={cancelEditingUsername}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={startEditingUsername}
            activeOpacity={0.7}
          >
            <View style={styles.settingContent}>
              <Ionicons name="person-outline" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Change Username</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        {/* iOS-specific sign out button */}
        {Platform.OS === 'ios' ? (
          <TouchableOpacity 
            style={styles.iosSignOutButton} 
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.iosSignOutText}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.settingContent}>
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={styles.settingText}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
        
        {/* Emergency logout button for iOS (hidden in normal UI) */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity 
            style={[styles.settingItem, { marginTop: 20 }]} 
            onPress={forceNavigateToLogin}
          >
            <View style={styles.settingContent}>
              <Ionicons name="exit-outline" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Return to Login Screen</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.settingText}>Version</Text>
          </View>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Ionicons name="code-outline" size={24} color="#007AFF" />
            <Text style={styles.settingText}>Made with</Text>
          </View>
          <Text style={styles.settingValue}>React Native</Text>
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Ionicons name="server-outline" size={24} color="#007AFF" />
            <Text style={styles.settingText}>Backend</Text>
          </View>
          <Text style={styles.settingValue}>Firebase</Text>
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Ionicons name="heart-outline" size={24} color="#007AFF" />
            <Text style={styles.settingText}>Created by</Text>
          </View>
          <Text style={styles.settingValue}>VeryFomo Team</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  settingValue: {
    fontSize: 17,
    color: '#8E8E93',
  },
  editUsernameContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  usernameInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    color: '#333',
  },
  iosSignOutButton: {
    backgroundColor: '#FF3B30',
    margin: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  iosSignOutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  }
});
