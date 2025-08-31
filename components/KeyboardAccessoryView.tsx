import { BlurView } from 'expo-blur';
import React from 'react';
import { PixelRatio, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAccessoryViewProps {
  children?: React.ReactNode;
}

export default function KeyboardAccessoryView({
  children,
}: KeyboardAccessoryViewProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate if keyboard is visible based on height
    const keyboardVisible = keyboard.height.value > 0;

    // Interpolate opacity based on keyboard height
    const opacity = interpolate(keyboard.height.value, [0, 50], [0, 1]);

    // Interpolate border opacity based on keyboard height
    const borderOpacity = interpolate(keyboard.height.value, [0, 50], [0, 0.1]);

    // Calculate translateY - when keyboard is closed, position at bottom + insets
    // When keyboard is open, position above keyboard
    const translateY = keyboardVisible
      ? -keyboard.height.value - 8 // 8px padding above keyboard
      : insets.bottom;

    return {
      opacity,
      transform: [{ translateY }],
      borderColor: interpolateColor(
        keyboard.height.value,
        [0, 50],
        ['rgba(0, 0, 0, 0)', `rgba(0, 0, 0, ${borderOpacity})`]
      ),
      shadowColor: interpolateColor(
        keyboard.height.value,
        [0, 50],
        ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 1)']
      ),
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Animated.View style={styles.accessoryView}>
        <BlurView intensity={80} style={styles.blurContainer} tint="light">
          {children}
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  accessoryView: {
    borderRadius: 20,
    borderWidth: 1 / PixelRatio.get(),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  blurContainer: {
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});
