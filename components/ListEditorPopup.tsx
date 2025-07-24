import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTodoStore } from '../store/todoStore';
import ColorPicker, { PASTEL_COLORS } from './ColorPicker';

interface ListEditorPopupProps {
  listId: string | null;
  isVisible: boolean;
  onClose: () => void;
  anchorX: SharedValue<number>;
  anchorY: SharedValue<number>;
  anchorWidth: SharedValue<number>;
  anchorHeight: SharedValue<number>;
}

export default function ListEditorPopup({
  listId,
  isVisible,
  onClose,
  anchorX,
  anchorY,
  anchorWidth,
  anchorHeight,
}: ListEditorPopupProps) {
  const [editedName, setEditedName] = useState('');
  const [editedColor, setEditedColor] = useState(PASTEL_COLORS[0]);

  const updateList = useTodoStore((state) => state.updateList);
  const deleteList = useTodoStore((state) => state.deleteList);
  const lists = useTodoStore((state) => state.lists);

  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const popupWidth = useSharedValue(24);
  const popupHeight = useSharedValue(24);
  const borderRadius = useSharedValue(12);

  const list = lists.find((l) => l.id === listId);

  useEffect(() => {
    if (list) {
      setEditedName(list.name);
      setEditedColor(list.color || PASTEL_COLORS[0]);
    }
  }, [list]);

  useEffect(() => {
    if (isVisible && list) {
      // Start from anchor button position (center of the dots button)
      const buttonCenterX = anchorX.value + anchorWidth.value / 2;
      const buttonCenterY = anchorY.value + anchorHeight.value / 2;

      translateX.value = buttonCenterX - 12; // Start from button center minus half button size
      translateY.value = buttonCenterY - 12;
      popupWidth.value = 24;
      popupHeight.value = 24;
      borderRadius.value = 12;
      opacity.value = 1;

      // Animate to popup size
      const targetWidth = 320;
      const targetHeight = 280;

      // Position popup to the right and below the button, but keep it on screen
      let targetX = buttonCenterX + 20;
      let targetY = buttonCenterY - 40;

      // Keep popup on screen
      if (targetX + targetWidth > 400) {
        // Assuming screen width, adjust as needed
        targetX = buttonCenterX - targetWidth - 20;
      }
      if (targetY + targetHeight > 800) {
        // Assuming screen height, adjust as needed
        targetY = buttonCenterY - targetHeight + 40;
      }
      if (targetX < 20) targetX = 20;
      if (targetY < 100) targetY = 100;

      translateX.value = withSpring(targetX, {
        damping: 16,
        stiffness: 200,
      });
      translateY.value = withSpring(targetY, {
        damping: 16,
        stiffness: 200,
      });
      popupWidth.value = withSpring(targetWidth, {
        damping: 16,
        stiffness: 200,
      });
      popupHeight.value = withSpring(targetHeight, {
        damping: 16,
        stiffness: 200,
      });
      borderRadius.value = withSpring(20, {
        damping: 16,
        stiffness: 200,
      });
    } else if (!isVisible) {
      // Animate back to anchor button position
      const buttonCenterX = anchorX.value + anchorWidth.value / 2;
      const buttonCenterY = anchorY.value + anchorHeight.value / 2;

      translateX.value = withSpring(buttonCenterX - 12, {
        damping: 16,
        stiffness: 200,
      });
      translateY.value = withSpring(buttonCenterY - 12, {
        damping: 16,
        stiffness: 200,
      });
      popupWidth.value = withSpring(24, {
        damping: 16,
        stiffness: 200,
      });
      popupHeight.value = withSpring(24, {
        damping: 16,
        stiffness: 200,
      });
      borderRadius.value = withSpring(12, {
        damping: 16,
        stiffness: 200,
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [
    isVisible,
    anchorX.value,
    anchorY.value,
    anchorWidth.value,
    anchorHeight.value,
  ]);

  const handleSave = () => {
    if (list && editedName.trim()) {
      updateList(list.id, {
        name: editedName.trim(),
        color: editedColor,
      });
      onClose();
    }
  };

  const handleDelete = () => {
    if (list) {
      deleteList(list.id);
      onClose();
    }
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const animatedPopupStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: translateX.value,
    top: translateY.value,
    width: popupWidth.value,
    height: popupHeight.value,
    borderRadius: borderRadius.value,
    opacity: opacity.value,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: isVisible ? interpolate(popupWidth.value, [24, 320], [0, 0.5]) : 0,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(popupWidth.value, [100, 320], [0, 1]),
  }));

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <View style={styles.overlay} pointerEvents={isVisible ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />
      </Pressable>

      <Animated.View style={[styles.popup, animatedPopupStyle]}>
        <BlurView style={styles.blurView} intensity={80} tint="light" />

        <Animated.View style={[styles.content, animatedContentStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit List</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#666" />
            </Pressable>
          </View>

          <TextInput
            style={styles.nameInput}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="List name..."
            placeholderTextColor="#666"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <ColorPicker
            selectedColor={editedColor}
            onColorSelect={setEditedColor}
          />

          <View style={styles.buttonContainer}>
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>

            <Pressable
              style={[
                styles.saveButton,
                !editedName.trim() && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!editedName.trim()}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  !editedName.trim() && styles.saveButtonTextDisabled,
                ]}
              >
                Save
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  popup: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    marginBottom: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    gap: 6,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  saveButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});
