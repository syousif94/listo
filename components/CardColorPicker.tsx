import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import {
  CardColor,
  cardColors,
  useColorSchemeStore,
} from '../store/colorSchemeStore';

export default function CardColorPicker() {
  const { cardColor, setCardColor } = useColorSchemeStore();
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'borderColor');

  const colorOptions: CardColor[] = [
    'yellow',
    'blue',
    'pink',
    'green',
    'purple',
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
      <Text style={[styles.title, { color: textColor }]}>List Color</Text>
      <View style={styles.colorRow}>
        {colorOptions.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.colorCircle,
              {
                backgroundColor: cardColors[color],
                borderColor: cardColor === color ? primaryColor : 'transparent',
              },
            ]}
            onPress={() => setCardColor(color)}
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
