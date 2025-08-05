import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface AudioMeterBarProps {
  meteringValue: number;
  maxHeight: number;
  color: string;
  opacity: number;
}

const AudioMeterBar: React.FC<AudioMeterBarProps> = ({
  meteringValue,
  maxHeight,
  color,
  opacity,
}) => {
  const height = useSharedValue(2); // Minimum height

  useEffect(() => {
    // Convert dB scale (-25 to 0) to normalized scale (0 to 1)
    // 0 dB = maximum height, -25 dB = minimum height
    const normalizedValue = Math.max(0, Math.min(1, (meteringValue + 25) / 25));
    const scaledHeight = Math.max(2, normalizedValue * maxHeight);

    height.value = withTiming(scaledHeight, {
      duration: 100,
    });
  }, [meteringValue, maxHeight, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
          opacity,
          borderRadius: 0.5,
          width: 1,
        },
        animatedStyle,
      ]}
    />
  );
};

interface AudioMeterProps {
  meteringValues: number[];
  barCount?: number;
  maxHeight?: number;
  color?: string;
  opacity?: number;
}

const AudioMeter: React.FC<AudioMeterProps> = ({
  meteringValues,
  barCount = 40,
  maxHeight = 12,
  color = 'white',
  opacity = 1,
}) => {
  // Create array of 40 bars with their corresponding metering values
  const bars = Array.from({ length: barCount }, (_, index) => {
    let meteringValue = 0;

    if (meteringValues.length > 0) {
      if (meteringValues.length >= barCount) {
        // If we have enough values, distribute them evenly
        const meteringIndex = Math.floor(
          (index / barCount) * meteringValues.length
        );
        meteringValue = meteringValues[meteringIndex] || 0;
      } else {
        // If we have fewer values, repeat them to fill all bars
        meteringValue = meteringValues[index % meteringValues.length] || 0;
      }

      // Add some randomness for a more natural wave effect
      // But reduce the randomness since we're working with actual dB values
      const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
      meteringValue *= randomFactor;
    }

    return {
      key: index,
      meteringValue,
    };
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: maxHeight,
        width: '100%',
      }}
    >
      {bars.map(({ key, meteringValue }) => (
        <AudioMeterBar
          key={key}
          meteringValue={meteringValue}
          maxHeight={maxHeight}
          color={color}
          opacity={opacity}
        />
      ))}
    </View>
  );
};

export default AudioMeter;
