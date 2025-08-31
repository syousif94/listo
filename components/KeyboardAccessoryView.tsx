import { BlurView } from 'expo-blur';
import React from 'react';
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
}

export default function KeyboardAccessoryView({
  children,
  nativeID,
}: KeyboardAccessoryViewProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
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

  return (
    <InputAccessoryView nativeID={nativeID}>
      <Animated.View style={[animatedStyle, styles.container]}>
        <BlurView intensity={80} style={styles.blurContainer} tint="extraLight">
          <Pressable
            onPressIn={handlePressIn}
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 16,
              flex: 1,
            }}
            onPress={() => {
              console.log('Accessory view pressed');
            }}
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
    justifyContent: 'center',
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
    elevation: 5,
    zIndex: 1000,
  },
});
