import { EvilIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { forwardRef, useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from '../hooks/useColorScheme';
import { useThemeColor } from '../hooks/useThemeColor';
import { useDatePickerStore } from '../store/datePickerStore';
import { TodoItem as TodoItemType, useTodoStore } from '../store/todoStore';
import AccessoryButton from './AccessoryButton';
import KeyboardAccessoryView from './KeyboardAccessoryView';

interface TodoItemProps {
  item: TodoItemType;
  listId: string;
  onDeleteEmpty: (itemId: string) => void;
  onFocusChange?: (itemId: string | null, text: string) => void;
}

const TodoItem = forwardRef<TextInput, TodoItemProps>(
  ({ item, listId, onDeleteEmpty, onFocusChange }, ref) => {
    const updateTodo = useTodoStore((state) => state.updateTodo);
    const toggleTodo = useTodoStore((state) => state.toggleTodo);

    // Theme colors
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const textColor = useThemeColor({}, 'text');
    const iconColor = isDark ? '#ffffff' : '#000000';

    const {
      isVisible: datePickerVisible,
      target: datePickerTarget,
      tempSelectedDate,
      tempSelectedHour,
      tempSelectedMinute,
      tempSelectedAmPm,
      tempSelectedYear,
      showDatePicker,
    } = useDatePickerStore();

    // State for focus tracking
    // const [isFocused, setIsFocused] = useState(false);

    // Check if this item is currently being edited in the date picker
    const isBeingEditedInDatePicker =
      datePickerVisible &&
      datePickerTarget?.type === 'todo' &&
      datePickerTarget.id === item.id &&
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

    // Format the temp editing date using the same logic as formatDueDate
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

    // Create unique accessory view ID for this todo item
    const ACCESSORY_VIEW_ID = `todo-accessory-${item.id}`;

    const checkboxOpacity = useSharedValue(1);
    const dateEditingOpacity = useSharedValue(0);

    const checkboxAnimatedStyle = useAnimatedStyle(() => ({
      opacity: checkboxOpacity.value,
    }));

    const dateEditingAnimatedStyle = useAnimatedStyle(() => ({
      opacity: dateEditingOpacity.value,
    }));

    const handleCheckboxPress = () => {
      // Fade effect
      checkboxOpacity.value = withTiming(0.3, { duration: 100 }, () => {
        checkboxOpacity.value = withTiming(1, { duration: 100 });
      });

      // Toggle the todo
      toggleTodo(listId, item.id);
    };

    const handleTextChange = (text: string) => {
      updateTodo(listId, item.id, { text });
      // Notify parent of text change if focused
      onFocusChange?.(item.id, text);
    };

    const handleFocus = () => {
      // setIsFocused(true);
      onFocusChange?.(item.id, item.text);
    };

    const handleBlur = () => {
      // setIsFocused(false);
      // Delete the todo if it's empty when blurred
      const trimmedText = item.text.trim();
      if (trimmedText === '') {
        onDeleteEmpty(item.id);
      }
      // Notify parent that nothing is focused
      onFocusChange?.(null, '');
    };

    // Date picker handlers
    const handleAccessoryPress = () => {
      showDatePicker({ type: 'todo', id: item.id, listId }, item.dueDate);
    };

    // Handle fade animation for date editing indicator
    useEffect(() => {
      if (isBeingEditedInDatePicker) {
        // Only animate if there was no due date initially
        if (!item.dueDate) {
          dateEditingOpacity.value = withTiming(1, { duration: 200 });
        } else {
          dateEditingOpacity.value = 1;
        }
      } else {
        // Only animate if there's no due date to show
        if (!item.dueDate) {
          dateEditingOpacity.value = withTiming(0, { duration: 200 });
        } else {
          dateEditingOpacity.value = 0;
        }
      }
    }, [isBeingEditedInDatePicker, item.dueDate, dateEditingOpacity]);

    // Only show accessory view if this item is focused and has text
    const shouldShowAccessory = item.text.trim().length > 0;

    const formatDueDate = (dueDate: string) => {
      const date = new Date(dueDate);
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

    return (
      <View>
        <View style={styles.itemRow}>
          <View style={styles.textInputContainer}>
            <TextInput
              ref={ref}
              style={[
                styles.itemText,
                {
                  color: item.completed
                    ? isDark
                      ? 'rgba(238, 238, 238, 0.3)'
                      : 'rgba(0, 0, 0, 0.3)'
                    : textColor,
                },
              ]}
              value={item.text}
              onChangeText={handleTextChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              multiline={true}
              scrollEnabled={false}
              inputAccessoryViewID={ACCESSORY_VIEW_ID}
            />
          </View>
          <Pressable onPress={handleCheckboxPress} hitSlop={8}>
            <Animated.View
              style={[
                styles.checkbox,
                {
                  borderColor: item.completed
                    ? isDark
                      ? 'rgba(238, 238, 238, 0.2)'
                      : 'rgba(0, 0, 0, 0.1)'
                    : isDark
                    ? 'rgba(238, 238, 238, 0.4)'
                    : 'rgba(0, 0, 0, 0.2)',
                },
                checkboxAnimatedStyle,
              ]}
            >
              {item.completed && <View style={styles.checkboxDot} />}
            </Animated.View>
          </Pressable>
        </View>
        {item.dueDate && !isBeingEditedInDatePicker && (
          <View style={styles.dueDateRow}>
            <Text
              style={[
                styles.dueDateText,
                {
                  color: isDark
                    ? 'rgba(238, 238, 238, 0.5)'
                    : 'rgba(0, 0, 0, 0.5)',
                },
              ]}
            >
              {formatDueDate(item.dueDate).dateText}
            </Text>
            <Text
              style={[
                styles.daysAwayText,
                {
                  color: formatDueDate(item.dueDate).isPastDue
                    ? '#ef4444'
                    : isDark
                    ? 'rgba(238, 238, 238, 0.5)'
                    : 'rgba(0, 0, 0, 0.5)',
                },
              ]}
            >
              {formatDueDate(item.dueDate).daysText}
            </Text>
          </View>
        )}
        {isBeingEditedInDatePicker && (
          <Animated.View style={[styles.dueDateRow, dateEditingAnimatedStyle]}>
            <Text
              style={[
                styles.dueDateText,
                styles.editingDateText,
                {
                  color: isDark ? '#0A84FF' : '#007AFF', // Blue color for editing state
                },
              ]}
            >
              {formatEditingDate().dateText}
            </Text>
            <Text
              style={[
                styles.daysAwayText,
                styles.editingDateText,
                {
                  color: formatEditingDate().isPastDue
                    ? '#ef4444'
                    : isDark
                    ? '#0A84FF'
                    : '#007AFF',
                },
              ]}
            >
              {formatEditingDate().daysText}
            </Text>
          </Animated.View>
        )}

        {/* Keyboard Accessory View - Only for this todo item */}
        <KeyboardAccessoryView
          nativeID={ACCESSORY_VIEW_ID}
          visible={shouldShowAccessory}
        >
          <AccessoryButton onPress={handleAccessoryPress}>
            <EvilIcons name="calendar" size={24} color={iconColor} />
            <Text style={[styles.accessoryText, { color: textColor }]}>
              Due Date
            </Text>
          </AccessoryButton>
        </KeyboardAccessoryView>
      </View>
    );
  }
);

TodoItem.displayName = 'TodoItem';

export default TodoItem;

const styles = StyleSheet.create({
  editingDateText: {
    // Color is now handled dynamically
  },
  dueDateRow: {
    paddingLeft: 20,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDateText: {
    fontSize: 8,
  },
  daysAwayText: {
    fontSize: 8,
  },
  pastDueText: {
    color: '#ef4444', // red-500
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  textInputContainer: {
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginLeft: 12,
    marginTop: 8,
  },
  checkboxCompleted: {
    // Colors now handled dynamically
  },
  checkboxDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -6 }, { translateY: -6 }],
  },
  itemText: {
    fontSize: 18,
    maxWidth: '100%',
    lineHeight: 24,
  },
  currentDateText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.4)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemTextCompleted: {
    // Color now handled dynamically
  },
  accessoryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 4,
  },
});
