import { format } from 'date-fns';
import React, { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TodoItem as TodoItemType, useTodoStore } from '../store/todoStore';

interface TodoItemProps {
  item: TodoItemType;
  listId: string;
  onDeleteEmpty: (itemId: string) => void;
}

const TodoItem = forwardRef<TextInput, TodoItemProps>(
  ({ item, listId, onDeleteEmpty }, ref) => {
    const updateTodo = useTodoStore((state) => state.updateTodo);
    const toggleTodo = useTodoStore((state) => state.toggleTodo);

    const checkboxOpacity = useSharedValue(1);

    const checkboxAnimatedStyle = useAnimatedStyle(() => ({
      opacity: checkboxOpacity.value,
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
    };

    const handleBlur = () => {
      // Delete the todo if it's empty when blurred
      const trimmedText = item.text.trim();
      if (trimmedText === '') {
        onDeleteEmpty(item.id);
      }
    };

    const formatDueDate = (dueDate: string) => {
      const date = new Date(dueDate);
      const today = new Date();

      // Reset time to start of day for accurate day comparison
      today.setHours(0, 0, 0, 0);
      const dateForComparison = new Date(date);
      dateForComparison.setHours(0, 0, 0, 0);

      const diffTime = dateForComparison.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Format date as before
      const dateText = format(date, 'MMM dd');

      // Format time
      const timeText = format(date, 'h:mmaaa')
        .replace('AM', 'AM')
        .replace('PM', 'PM');

      let daysText = '';
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

      return {
        dateText: `${dateText} ${timeText}`,
        daysText,
        isPastDue: diffDays < 0,
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
                item.completed && styles.itemTextCompleted,
              ]}
              value={item.text}
              onChangeText={handleTextChange}
              onBlur={handleBlur}
              multiline={true}
              scrollEnabled={false}
            />
          </View>
          <Pressable onPress={handleCheckboxPress} hitSlop={8}>
            <Animated.View
              style={[
                styles.checkbox,
                item.completed && styles.checkboxCompleted,
                checkboxAnimatedStyle,
              ]}
            >
              {item.completed && <View style={styles.checkboxDot} />}
            </Animated.View>
          </Pressable>
        </View>
        {item.dueDate && (
          <View style={styles.dueDateRow}>
            <Text style={styles.dueDateText}>
              {formatDueDate(item.dueDate).dateText}
            </Text>
            <Text
              style={[
                styles.daysAwayText,
                formatDueDate(item.dueDate).isPastDue && styles.pastDueText,
              ]}
            >
              {formatDueDate(item.dueDate).daysText}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

TodoItem.displayName = 'TodoItem';

export default TodoItem;

const styles = StyleSheet.create({
  dueDateRow: {
    paddingLeft: 20,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginLeft: 12,
    marginTop: 8,
  },
  checkboxCompleted: {
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
    color: 'rgba(0, 0, 0, 0.7)',
    maxWidth: '100%',
    lineHeight: 24,
  },
  itemTextCompleted: {
    color: 'rgba(0, 0, 0, 0.3)',
  },
});
