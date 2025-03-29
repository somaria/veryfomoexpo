# VeryFomo - Real-time Chat Application
**Version 1.0.0**

VeryFomo is a real-time chat application built with React Native, Expo, and Firebase. It enables users to communicate through instant messaging in a modern, responsive interface.

## Features

- **Authentication System**
  - Email/password authentication for testing with predefined test users
  - User profile management with display name and profile photo
  - Platform-specific test accounts for iOS and Android

- **Real-time Chat**
  - One-on-one messaging between users
  - Real-time updates using Firebase Firestore
  - Chat history persistence
  - User typing indicators

- **Contacts Management**
  - View all users in the system
  - User presence and last active status
  - Start new conversations from contacts list

- **Cross-Platform**
  - Works on both iOS and Android via Expo Go
  - Consistent UI with platform-specific adaptations
  - Responsive design for various screen sizes

## Technical Implementation

### Architecture

- **Frontend**: React Native with Expo Router for navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **State Management**: React Context API

### Firebase Integration

- Uses Firebase Web SDK for Expo Go compatibility
- Real-time data synchronization with Firestore
- Secure authentication with email/password
- File storage for profile images

### Directory Structure

- **/app**: Main application code
  - **/app/(tabs)**: Tab-based navigation screens
  - **/app/chat**: Chat-related screens
  - **/app/contexts**: React Context providers
  - **/app/services**: Service modules for Firebase interaction
  - **/app/utils**: Utility functions

- **/scripts**: Utility scripts for development and testing
  - **manage-users.js**: Create and manage test users
  - **reset-project.js**: Reset project to a clean state

## Development Setup

1. **Prerequisites**
   - Node.js (v16+)
   - npm or yarn
   - Expo CLI
   - Firebase account

2. **Installation**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   - Create a Firebase project
   - Enable Authentication, Firestore, and Storage
   - Add your Firebase configuration to `firebase.config.js`

4. **Create Test Users**
   ```bash
   node scripts/manage-users.js
   ```

5. **Start Development Server**
   ```bash
   npx expo start
   ```

## Build and Deployment Guide

### Android Builds

1. **Development Build (Local)**
   ```bash
   npx expo run:android
   ```

2. **Preview Build (EAS Cloud)**
   ```bash
   npx eas build --platform android --profile preview
   ```
   - This creates an internal distribution build that can be installed on test devices
   - The build will be available for download from the EAS dashboard

3. **Production Build**
   ```bash
   npx eas build --platform android --profile production
   ```

### iOS Builds

1. **Development Build (Local)**
   ```bash
   npx expo run:ios
   ```
   - This is the recommended approach for iOS development and testing
   - Builds and runs the app directly on the iOS simulator

2. **Preview/Production Builds**
   
   Due to module redefinition issues with EAS cloud builds for iOS, local builds are recommended:
   
   ```bash
   # Generate native iOS project
   npx expo prebuild --platform ios --clean
   
   # Open in Xcode
   open ios/VeryFomo.xcworkspace
   
   # Build archive in Xcode
   # 1. Select "Any iOS Device" as the build target
   # 2. Select Product > Archive from the menu
   # 3. Use the Organizer window to distribute the app
   ```

### Known Build Issues

- **iOS EAS Cloud Builds**: Experience module redefinition errors in the React-RCTAppDelegate target
  - **Root Cause**: Conflicts between React Native dependencies in the cloud build environment
  - **Solution**: Use local builds with `npx expo run:ios` instead

- **Firebase SDK Conflicts**: The app uses the Firebase Web SDK for Expo Go compatibility
  - **Important**: Do not install React Native Firebase native modules (@react-native-firebase/app, @react-native-firebase/auth) as they conflict with the Web SDK

### Build Configuration

- **eas.json**: Contains build profiles for EAS builds
  - **preview**: Internal distribution for testing
  - **ios-build**: Specialized profile for iOS with simulator support
  - **production**: Production build configuration

- **app.json**: Contains app configuration
  - The `"newArchEnabled": false` setting is important to avoid build issues

## Testing

The app includes predefined test users for both iOS and Android platforms:

### iOS Test Users
- iphoneuser1@test.com (password: test123)
- iphoneuser2@test.com (password: test123)
- iphoneuser3@test.com (password: test123)

### Android Test Users
- androiduser1@test.com (password: test123)
- androiduser2@test.com (password: test123)
- androiduser3@test.com (password: test123)

## Utility Scripts

- **clear-firebase-data.js**: Clears all Firebase Authentication users and Firestore data
- **clear-firestore-data.js**: Clears only Firestore data (preserves users)
- **create-test-users.js**: Creates predefined test users in Firebase Authentication
- **delete-firebase-auth-users.js**: Deletes all Firebase Authentication users
- **manage-users.js**: Comprehensive user management script
- **reset-project.js**: Resets the project to a clean state

## Future Enhancements

- Push notifications using Firebase Cloud Messaging (FCM)
- Group chat functionality
- Media sharing capabilities
- End-to-end encryption
- User blocking and reporting features

## Known Issues

- Multiple anonymous users may be created for the same device (resolved by switching to email/password auth)
- Firebase Web SDK limitations in native environments
- iOS cloud builds fail with module redefinition errors (use local builds instead)

## License

This project is proprietary and confidential.

---

*Last updated: March 30, 2025*
