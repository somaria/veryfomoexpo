# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Styling with NativeWind

This project uses [NativeWind](https://www.nativewind.dev/) (v4) for styling, which brings the power of Tailwind CSS to React Native. NativeWind allows you to use className props instead of StyleSheet objects for a more concise and maintainable styling approach.

### Usage

```jsx
// Instead of this (StyleSheet approach):
<View style={styles.container}>
  <Text style={styles.text}>Hello World</Text>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
  },
});

// Use this (NativeWind approach):
<View className="flex-1 items-center justify-center">
  <Text className="text-2xl">Hello World</Text>
</View>
```

### Styling Guidelines

- Use NativeWind classes for styling whenever possible
- Only use StyleSheet.create() when you need complex styling that can't be achieved with NativeWind
- Refer to the [Tailwind CSS documentation](https://tailwindcss.com/docs) for available utility classes
- Custom theme extensions can be added in the tailwind.config.js file

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
