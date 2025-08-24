import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastProps {
  message: string;
  duration?: number;
  isVisible: boolean;
  onHide: () => void;
}

export default function ToastNotification({
  message,
  duration = 3000,
  isVisible,
  onHide,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // Animate in
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto hide after duration
      translateY.value = withDelay(
        duration,
        withSequence(
          withTiming(-100, { duration: 300 }),
          withTiming(-100, { duration: 0 }, () => {
            runOnJS(onHide)();
          })
        )
      );
      opacity.value = withDelay(duration, withTiming(0, { duration: 300 }));
    }
  }, [isVisible, duration, translateY, opacity, onHide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
});
