import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTodoStore } from '../store/todoStore';
import ColorPicker, { PASTEL_COLORS } from './ColorPicker';

const { width } = Dimensions.get('window');

interface FloatingTodoInputProps {
  onAddTodo?: (text: string, listId: string) => void;
  onEditComplete?: () => void;
}

export default function FloatingTodoInput({
  onAddTodo,
  onEditComplete,
}: FloatingTodoInputProps) {
  const [todoText, setTodoText] = useState('');
  const [showListPicker, setShowListPicker] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);

  const newListInputRef = useRef<TextInput>(null);

  const lists = useTodoStore((state) => state.lists);
  const addList = useTodoStore((state) => state.addList);
  const updateList = useTodoStore((state) => state.updateList);
  const addTodoToList = useTodoStore((state) => state.addTodoToList);

  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  const containerHeight = useSharedValue(60);
  const inputOpacity = useSharedValue(1);
  const listPickerOpacity = useSharedValue(0);
  const buttonColorProgress = useSharedValue(0);
  const micIconScale = useSharedValue(1);
  const micIconOpacity = useSharedValue(1);
  const plusIconScale = useSharedValue(0);
  const plusIconOpacity = useSharedValue(0);

  useEffect(() => {
    if (showListPicker) {
      containerHeight.value = withTiming(340, { duration: 300 });
      inputOpacity.value = withTiming(0, { duration: 200 });
      listPickerOpacity.value = withTiming(1, { duration: 300 });
    } else {
      containerHeight.value = withTiming(60, { duration: 300 });
      inputOpacity.value = withTiming(1, { duration: 300 });
      listPickerOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showListPicker]);

  useEffect(() => {
    if (todoText.length > 0) {
      buttonColorProgress.value = withTiming(1, { duration: 300 });
      micIconScale.value = withTiming(0, { duration: 200 });
      micIconOpacity.value = withTiming(0, { duration: 200 });
      plusIconScale.value = withTiming(1, { duration: 300 });
      plusIconOpacity.value = withTiming(1, { duration: 300 });
    } else {
      buttonColorProgress.value = withTiming(0, { duration: 300 });
      micIconScale.value = withTiming(1, { duration: 300 });
      micIconOpacity.value = withTiming(1, { duration: 300 });
      plusIconScale.value = withTiming(0, { duration: 200 });
      plusIconOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [todoText.length]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: containerHeight.value,
      transform: [
        {
          translateY: -keyboard.height.value,
        },
      ],
    };
  });

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      opacity: inputOpacity.value,
    };
  });

  const animatedListPickerStyle = useAnimatedStyle(() => {
    return {
      opacity: listPickerOpacity.value,
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      buttonColorProgress.value,
      [0, 1],
      ['#FF3B30', '#007AFF']
    );

    return {
      backgroundColor,
    };
  });

  const animatedMicIconStyle = useAnimatedStyle(() => {
    return {
      opacity: micIconOpacity.value,
      transform: [{ scale: micIconScale.value }],
    };
  });

  const animatedPlusIconStyle = useAnimatedStyle(() => {
    return {
      opacity: plusIconOpacity.value,
      transform: [{ scale: plusIconScale.value }],
    };
  });

  const handleAddTodo = () => {
    if (!todoText.trim()) return;
    setShowListPicker(true);
    setTimeout(() => {
      newListInputRef.current?.focus();
    }, 350);
  };

  const handleSelectList = (listId: string) => {
    setSelectedListId(listId);
  };

  const handleCancel = () => {
    setShowListPicker(false);
    setNewListName('');
    setSelectedListId(null);
    setSelectedColor(PASTEL_COLORS[0]);
    onEditComplete?.();
  };

  const handleAddList = () => {
    if (newListName.trim()) {
      addList(newListName.trim());
      setTimeout(() => {
        const newList = useTodoStore
          .getState()
          .lists.find((l) => l.name === newListName.trim());
        if (newList) {
          updateList(newList.id, { color: selectedColor });
          setSelectedListId(newList.id);
          setNewListName('');
          setSelectedColor(PASTEL_COLORS[0]);
        }
      }, 100);
    }
  };

  const handleDone = () => {
    if (selectedListId) {
      addTodoToList(selectedListId, todoText.trim());
      setTodoText('');
      setShowListPicker(false);
      setSelectedListId(null);
      setSelectedColor(PASTEL_COLORS[0]);
      onAddTodo?.(todoText.trim(), selectedListId);
    }
  };

  const renderListItem = ({ item, index }: { item: any; index: number }) => (
    <>
      <Pressable
        style={[
          styles.listItem,
          selectedListId === item.id && styles.listItemSelected,
        ]}
        onPress={() => handleSelectList(item.id)}
      >
        <Text style={styles.listItemText}>{item.name}</Text>
        <Text style={styles.listItemCount}>{item.items.length} items</Text>
      </Pressable>
      {index < lists.length - 1 && <View style={styles.listItemDivider} />}
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardAvoidingView]}
      keyboardVerticalOffset={0}
    >
      <Animated.View
        style={[
          styles.container,
          animatedContainerStyle,
          { bottom: insets.bottom },
        ]}
      >
        <BlurView style={styles.blurView} intensity={80} tint="light" />

        <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
          <TextInput
            style={styles.textInput}
            value={todoText}
            onChangeText={setTodoText}
            placeholder="Add a new todo..."
            placeholderTextColor="#666"
            multiline
            onSubmitEditing={handleAddTodo}
          />

          <Pressable
            style={[styles.addButton, showListPicker && styles.addButtonActive]}
            onPress={handleAddTodo}
          >
            <Animated.View style={[styles.addButton, animatedButtonStyle]}>
              <Animated.View
                style={[styles.iconContainer, animatedMicIconStyle]}
              >
                <Ionicons name="mic" size={20} color="#fff" />
              </Animated.View>
              <Animated.View
                style={[styles.iconContainer, animatedPlusIconStyle]}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </Animated.View>
            </Animated.View>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.listPicker, animatedListPickerStyle]}>
          <View style={styles.newListSection}>
            <TextInput
              ref={newListInputRef}
              style={styles.newListInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="Create new list..."
              placeholderTextColor="#666"
              returnKeyType="done"
              onSubmitEditing={handleAddList}
            />

            <ColorPicker
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />

            <Pressable
              style={[
                styles.addListButton,
                !newListName.trim() && styles.addListButtonDisabled,
              ]}
              onPress={handleAddList}
              disabled={!newListName.trim()}
            >
              <Text
                style={[
                  styles.addListButtonText,
                  !newListName.trim() && styles.addListButtonTextDisabled,
                ]}
              >
                Add List
              </Text>
            </Pressable>
          </View>

          <View style={styles.separator} />

          <FlatList
            data={lists}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id}
            style={styles.listPickerList}
            contentContainerStyle={styles.listPickerContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          <View style={styles.separator} />

          <View style={styles.buttonContainer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.doneButton,
                !selectedListId && styles.doneButtonDisabled,
              ]}
              onPress={handleDone}
              disabled={!selectedListId}
            >
              <Text
                style={[
                  styles.doneButtonText,
                  !selectedListId && styles.doneButtonTextDisabled,
                ]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(240, 240, 240, 0.3)',
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
    width: 54,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonActive: {
    // Remove backgroundColor since it's now animated
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 4,
    height: 44,
  },
  listPicker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    borderRadius: 30,
  },
  listPickerList: {
    flex: 1,
  },
  listPickerContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  listItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  listItemCount: {
    fontSize: 14,
    color: '#666',
  },
  listItemDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 0,
  },
  newListInput: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    margin: 12,
    marginBottom: 0,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 15,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  doneButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  doneButtonTextDisabled: {
    color: '#999',
  },
  newListSection: {},
  addListButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  addListButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  addListButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  addListButtonTextDisabled: {
    color: '#999',
  },
});
