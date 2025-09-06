import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import {
  RecordingButtonColor,
  recordingButtonColors,
  useColorSchemeStore,
} from '../store/colorSchemeStore';

export default function RecordingButtonColorPicker() {
  const { recordingButtonColor, setRecordingButtonColor } =
    useColorSchemeStore();
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'borderColor');

  const colorOptions: RecordingButtonColor[] = [
    'green',
    'pink',
    'red',
    'purple',
    'blue',
    'orange',
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor,
          borderColor: borderColor,
        },
      ]}
    >
      <Text style={[styles.title, { color: textColor }]}>
        Recording Button Color
      </Text>
      <View style={styles.colorRow}>
        {colorOptions.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.colorCircle,
              {
                backgroundColor: recordingButtonColors[color],
                borderColor:
                  recordingButtonColor === color ? primaryColor : 'transparent',
              },
            ]}
            onPress={() => setRecordingButtonColor(color)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
});
