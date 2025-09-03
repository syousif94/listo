import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { InputAccessoryView, PixelRatio, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface KeyboardAccessoryViewProps {
  children?: React.ReactNode;
  nativeID: string;
  visible?: boolean;
}

export default function KeyboardAccessoryView({
  children,
  nativeID,
  visible = true,
}: KeyboardAccessoryViewProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSpring(visible ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <InputAccessoryView nativeID={nativeID}>
      <Animated.View style={[animatedStyle, styles.container]}>
        <BlurView intensity={80} style={styles.blurContainer} tint="extraLight">
          <View style={styles.buttonContainer}>{children}</View>
        </BlurView>
      </Animated.View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  blurContainer: {
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1 / PixelRatio.get(),
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    flex: 1,
    gap: 8,
  },
});
