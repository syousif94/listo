import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTodoStore } from '../store/todoStore';
import KeyboardAccessoryView from './KeyboardAccessoryView';

export interface NewTodoInputRef {
  clearAndBlur: () => void;
}

interface NewTodoInputProps {
  listId: string;
  onFocusChange?: (isFocused: boolean, text?: string) => void;
  showEmptyState?: boolean;
  disabled?: boolean;
  onDatePickerRequest?: (target: { type: 'newTodo'; text?: string }) => void;
  pendingDueDate?: string;
  onClearPendingDate?: () => void;
}

const NewTodoInput = forwardRef<NewTodoInputRef, NewTodoInputProps>(
  (
    {
      listId,
      onFocusChange,
      showEmptyState = false,
      disabled = false,
      onDatePickerRequest,
      pendingDueDate,
      onClearPendingDate,
    },
    ref
  ) => {
    const addTodoToList = useTodoStore((state) => state.addTodoToList);
    const [text, setText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const opacity = useSharedValue(0); // Start completely invisible

    // Create unique accessory view ID for new todo input
    const ACCESSORY_VIEW_ID = `new-todo-accessory-${listId}`;

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const handleFooterTap = () => {
      if (isFocused || disabled) return;
      console.log('Footer tapped');
      opacity.value = withTiming(1, { duration: 200 });
      inputRef.current?.focus();
    };

    const handleFocus = () => {
      console.log('Input focused');
      opacity.value = withTiming(1, { duration: 200 });
      setIsFocused(true);
      onFocusChange?.(true, text);
    };

    const handleBlur = () => {
      const trimmedText = text.trim();

      if (trimmedText !== '') {
        // Create new todo with the text and pending due date
        addTodoToList(listId, trimmedText, pendingDueDate);
        // Clear the input and pending date
        setText('');
        onClearPendingDate?.();
      }

      // Fade back to invisible
      opacity.value = withTiming(0, { duration: 200 });
      setIsFocused(false);
      onFocusChange?.(false, '');
    };

    const handleChangeText = (newText: string) => {
      setText(newText);
      if (isFocused) {
        onFocusChange?.(true, newText);
      }
    };

    // Date picker handler
    const handleAccessoryPress = () => {
      onDatePickerRequest?.({ type: 'newTodo', text });
    };

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        clearAndBlur: () => {
          setText('');
          onClearPendingDate?.();
          // Fade back to invisible
          opacity.value = withTiming(0, { duration: 200 });
          setIsFocused(false);
          onFocusChange?.(false, '');
          inputRef.current?.blur();
        },
      }),
      [onClearPendingDate, opacity, onFocusChange]
    );

    console.log('rendering');

    return (
      <Pressable
        style={[styles.container, disabled && styles.disabledContainer]}
        onPress={handleFooterTap}
        disabled={disabled}
      >
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
              inputAccessoryViewID={ACCESSORY_VIEW_ID}
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

        {/* Keyboard Accessory View - Only for new todo input */}
        <KeyboardAccessoryView
          nativeID={ACCESSORY_VIEW_ID}
          onPress={handleAccessoryPress}
        >
          <Text style={styles.accessoryText}>Add Due Date</Text>
        </KeyboardAccessoryView>
      </Pressable>
    );
  }
);

NewTodoInput.displayName = 'NewTodoInput';

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
  disabledContainer: {
    opacity: 0.5,
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
  accessoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});
