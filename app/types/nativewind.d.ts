import 'react-native';

declare module 'react-native' {
  interface TextProps {
    className?: string;
  }
  interface ViewProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
}

// Add an empty default export to satisfy Expo Router's requirements
export default {};
