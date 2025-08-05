import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

const PASTEL_COLORS = [
  '#E8F4FD', // Soft blue
  '#F0F9FF', // Light blue
  '#FEF3C7', // Soft yellow
  '#D1FAE5', // Light green
  '#FCE7F3', // Soft pink
  '#E0E7FF', // Light purple
  '#FED7AA', // Soft orange
  '#F3E8FF', // Light lavender
  '#DBEAFE', // Soft sky blue
  '#F0FDF4', // Light mint
  '#FEF7CD', // Cream yellow
  '#FECACA', // Soft coral
];

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export { PASTEL_COLORS };

export default function ColorPicker({
  selectedColor,
  onColorSelect,
}: ColorPickerProps) {
  return (
    <View style={styles.colorPicker}>
      <FlatList
        data={PASTEL_COLORS}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.colorCircle,
              { backgroundColor: item },
              selectedColor === item && styles.colorCircleSelected,
            ]}
            onPress={() => onColorSelect(item)}
          />
        )}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorPickerContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  colorPicker: {},
  colorPickerContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#007AFF',
  },
});
