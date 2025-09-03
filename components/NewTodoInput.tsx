import { EvilIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, {
  forwardRef,
  useEffect,
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
import { useDatePickerStore } from '../store/datePickerStore';
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
      pendingDueDate,
      onClearPendingDate,
    },
    ref
  ) => {
    const addTodoToList = useTodoStore((state) => state.addTodoToList);
    const {
      showDatePicker,
      isVisible: datePickerVisible,
      target: datePickerTarget,
      tempSelectedDate,
      tempSelectedHour,
      tempSelectedMinute,
      tempSelectedAmPm,
      tempSelectedYear,
    } = useDatePickerStore();
    const [text, setText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const opacity = useSharedValue(0); // Start completely invisible

    // Create unique accessory view ID for new todo input
    const ACCESSORY_VIEW_ID = `new-todo-accessory-${listId}`;

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    // Check if this input is currently being edited in the date picker
    const isBeingEditedInDatePicker =
      datePickerVisible &&
      datePickerTarget?.type === 'newTodo' &&
      datePickerTarget.listId === listId;

    // Construct current date from temp picker values
    const getCurrentDateFromPicker = () => {
      const currentDate = new Date(tempSelectedDate);
      currentDate.setHours(
        tempSelectedAmPm === 1
          ? tempSelectedHour === 12
            ? 12
            : tempSelectedHour + 12
          : tempSelectedHour === 12
          ? 0
          : tempSelectedHour
      );
      currentDate.setMinutes(tempSelectedMinute);
      currentDate.setFullYear(tempSelectedYear);
      return currentDate;
    };

    // Format the temp editing date using the same logic as TodoItem
    const formatEditingDate = () => {
      const date = getCurrentDateFromPicker();
      const now = new Date();

      // Calculate time difference in milliseconds
      const diffTime = date.getTime() - now.getTime();
      const diffMinutes = Math.round(diffTime / (1000 * 60));
      const diffHours = Math.round(diffTime / (1000 * 60 * 60));

      // Reset time to start of day for accurate day comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateForComparison = new Date(date);
      dateForComparison.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil(
        (dateForComparison.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Format date as before
      const dateText = format(date, 'MMM dd');

      // Format time
      const timeText = format(date, 'h:mmaaa')
        .replace('AM', 'AM')
        .replace('PM', 'PM');

      let daysText = '';

      // If less than 1 hour away, show minutes
      if (Math.abs(diffMinutes) < 60) {
        const absMinutes = Math.abs(diffMinutes);
        if (absMinutes === 0) {
          daysText = 'now';
        } else {
          daysText = `${absMinutes}m`;
        }
      }
      // If between 1 hour and 1 day, show hours
      else if (Math.abs(diffHours) < 24) {
        const absHours = Math.abs(diffHours);
        daysText = absHours === 1 ? '1hr' : `${absHours}hr`;
      }
      // If 1 day or more, use day format
      else {
        if (diffDays === 0) {
          daysText = 'today';
        } else if (diffDays === 1) {
          daysText = '1d';
        } else if (diffDays === -1) {
          daysText = '1d';
        } else if (diffDays > 0) {
          daysText = `${diffDays}d`;
        } else {
          daysText = `${Math.abs(diffDays)}d`;
        }
      }

      return {
        dateText: `${dateText} ${timeText}`,
        daysText,
        isPastDue: diffTime < 0,
      };
    };

    // Animation for date editing indicator
    const dateEditingOpacity = useSharedValue(0);
    const dateEditingAnimatedStyle = useAnimatedStyle(() => ({
      opacity: dateEditingOpacity.value,
    }));

    // Handle fade animation for date editing indicator
    useEffect(() => {
      if (isBeingEditedInDatePicker) {
        // Only animate if there was no pending date initially
        if (!pendingDueDate) {
          dateEditingOpacity.value = withTiming(1, { duration: 200 });
        } else {
          dateEditingOpacity.value = 1;
        }
      } else {
        // Only animate if there's no pending date to show
        if (!pendingDueDate) {
          dateEditingOpacity.value = withTiming(0, { duration: 200 });
        } else {
          dateEditingOpacity.value = 0;
        }
      }
    }, [isBeingEditedInDatePicker, pendingDueDate, dateEditingOpacity]);

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
      showDatePicker({ type: 'newTodo', listId }, pendingDueDate);
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

    const shouldShowAccessory = text.trim().length > 0;

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

        {/* Date editing indicator for new todo */}
        {isBeingEditedInDatePicker && (
          <Animated.View style={[styles.dueDateRow, dateEditingAnimatedStyle]}>
            <Text style={[styles.dueDateText, styles.editingDateText]}>
              {formatEditingDate().dateText}
            </Text>
            <Text
              style={[
                styles.daysAwayText,
                styles.editingDateText,
                formatEditingDate().isPastDue && styles.pastDueText,
              ]}
            >
              {formatEditingDate().daysText}
            </Text>
          </Animated.View>
        )}

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
          visible={shouldShowAccessory}
        >
          <EvilIcons name="calendar" size={24} color="black" />
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
  editingDateText: {
    color: '#007AFF', // Blue color for editing state
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
    marginLeft: 4,
    marginRight: 4,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    gap: 8,
  },
  dueDateText: {
    fontSize: 8,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  daysAwayText: {
    fontSize: 8,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  pastDueText: {
    color: '#FF3B30',
  },
});
