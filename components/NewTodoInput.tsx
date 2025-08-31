import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTodoStore } from '../store/todoStore';

interface NewTodoInputProps {
  listId: string;
  onFocusChange?: (isFocused: boolean) => void;
  showEmptyState?: boolean;
  inputAccessoryViewID?: string;
}

function NewTodoInput({
  listId,
  onFocusChange,
  showEmptyState = false,
  inputAccessoryViewID,
}: NewTodoInputProps) {
  const addTodoToList = useTodoStore((state) => state.addTodoToList);
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const opacity = useSharedValue(0); // Start completely invisible

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleFooterTap = () => {
    if (isFocused) return;
    console.log('Footer tapped');
    opacity.value = withTiming(1, { duration: 200 });
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    console.log('Input focused');
    opacity.value = withTiming(1, { duration: 200 });
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    const trimmedText = text.trim();

    if (trimmedText !== '') {
      // Create new todo with the text
      addTodoToList(listId, trimmedText);
      // Clear the input
      setText('');
    }

    // Fade back to invisible
    opacity.value = withTiming(0, { duration: 200 });
    setIsFocused(false);
    onFocusChange?.(false);
  };

  const handleChangeText = (newText: string) => {
    setText(newText);
  };

  console.log('rendering');

  return (
    <Pressable style={styles.container} onPress={handleFooterTap}>
      <Animated.View style={[styles.inputContainer, animatedStyle]}>
        <View style={styles.textInputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline={true}
            scrollEnabled={false}
            inputAccessoryViewID={inputAccessoryViewID}
            placeholder="Add a new item"
          />
        </View>
        <View style={styles.checkbox} />
      </Animated.View>
      {showEmptyState && !isFocused ? (
        <Animated.View style={styles.emptyContainer} pointerEvents={'none'}>
          <Text style={styles.emptyTitleText}>Empty List</Text>
          <Text style={styles.emptyText}>
            Tap anywhere to create a new item or press the green button to
            dictate.
          </Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

export default React.memo(NewTodoInput);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  input: {
    fontSize: 18,
    color: 'rgba(0, 0, 0, 0.7)',
    lineHeight: 24,
    maxWidth: '100%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginLeft: 12,
    marginTop: 8,
  },
  emptyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16 * 1.6,
    width: 280,
  },
  emptyTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#bbb',
    marginBottom: 20,
  },
});
