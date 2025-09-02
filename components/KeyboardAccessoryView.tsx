import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { InputAccessoryView, PixelRatio, StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface KeyboardAccessoryViewProps {
  children?: React.ReactNode;
  nativeID: string;
  onPress?: () => void;
  visible?: boolean;
}

export default function KeyboardAccessoryView({
  children,
  nativeID,
  onPress,
  visible = true,
}: KeyboardAccessoryViewProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSpring(visible ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.6, {
      damping: 15,
      stiffness: 300,
    });
    console.log('Accessory view pressed in');
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    console.log('Accessory view pressed out');
  };

  const handlePress = () => {
    if (!visible) return; // Don't handle press when not visible
    console.log('Accessory view pressed');
    onPress?.();
  };

  return (
    <InputAccessoryView nativeID={nativeID}>
      <Animated.View style={[animatedStyle, styles.container]}>
        <BlurView intensity={80} style={styles.blurContainer} tint="extraLight">
          <Pressable
            onPressIn={handlePressIn}
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 12,
              flex: 1,
              flexDirection: 'row',
            }}
            onPress={handlePress}
            onPressOut={handlePressOut}
          >
            {children}
          </Pressable>
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
});
