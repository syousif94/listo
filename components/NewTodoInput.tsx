import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTodoStore } from '../store/todoStore';

interface NewTodoInputProps {
  listId: string;
  onFocusChange?: (isFocused: boolean) => void;
}

export default function NewTodoInput({
  listId,
  onFocusChange,
}: NewTodoInputProps) {
  const addTodoToList = useTodoStore((state) => state.addTodoToList);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const opacity = useSharedValue(0); // Start completely invisible

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleFooterTap = () => {
    opacity.value = withTiming(1, { duration: 200 });
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    opacity.value = withTiming(1, { duration: 200 });
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
    onFocusChange?.(false);
  };

  const handleChangeText = (newText: string) => {
    setText(newText);
  };

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
          />
        </View>
        <View style={styles.checkbox} />
      </Animated.View>
    </Pressable>
  );
}

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
});
