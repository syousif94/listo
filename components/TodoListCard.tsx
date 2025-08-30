import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import React, { useEffect } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { ContextMenuView } from 'react-native-ios-context-menu';
import Animated, {
  FadeInUp,
  LinearTransition,
  measure,
  runOnJS,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TodoList, useTodoStore } from '../store/todoStore';

interface TodoListCardProps {
  list: TodoList;
  width: number;
  isExpanded: boolean;
  onPress: (
    scaledPosition: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    normalPosition: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => void;
  onDismiss: () => void;
  onEdit: (
    listId: string,
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => void;
  index: number;
}

export default function TodoListCard({
  list,
  width,
  isExpanded,
  onPress,
  onDismiss,
  onEdit,
  index,
}: TodoListCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const toggleTodo = useTodoStore((state) => state.toggleTodo);
  const deleteList = useTodoStore((state) => state.deleteList);

  const parentAnimatedRef = useAnimatedRef();
  const animatedRef = useAnimatedRef();

  useEffect(() => {
    if (isExpanded) {
      opacity.value = 0;
    } else {
      opacity.value = 1;
    }
  }, [isExpanded, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    runOnUI(() => {
      console.log('pressed starting');
      const scaledMeasurement = measure(animatedRef);
      const normalMeasurement = measure(parentAnimatedRef);

      if (scaledMeasurement === null || normalMeasurement === null) {
        return;
      }

      console.log('pressed');

      runOnJS(onPress)(
        {
          x: scaledMeasurement.pageX,
          y: scaledMeasurement.pageY,
          width: scaledMeasurement.width,
          height: scaledMeasurement.height,
        },
        {
          x: normalMeasurement.pageX + 4, // Offset by horizontal padding
          y: normalMeasurement.pageY + 6, // Offset by vertical padding
          width: normalMeasurement.width - 15, // Subtract horizontal padding from both sides
          height: normalMeasurement.height - 12, // Subtract vertical padding from both sides
        }
      );
    })();
  };

  const handlePressIn = () => {
    runOnUI(() => {
      // Scale down
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
    })();
    console.log('press in');
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const generateMarkdown = () => {
    let markdown = `# ${list.name}\n\n`;

    if (list.items.length === 0) {
      markdown += '(No items)';
    } else {
      list.items.forEach((item) => {
        const checkbox = item.completed ? '- [x]' : '- [ ]';
        markdown += `${checkbox} ${item.text}\n`;
      });
    }

    return markdown;
  };

  const shareList = async () => {
    try {
      const markdown = generateMarkdown();
      // Clean the list name to be a valid filename
      const sanitizedName = list.name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
      const filename = `${sanitizedName || 'todo-list'}.md`;

      // Create a temporary file path
      const tempDir = `${FileSystem.cacheDirectory}shared_lists/`;

      // Create directory if it doesn't exist
      await FileSystem.makeDirectoryAsync(tempDir, {
        intermediates: true,
      }).catch(() => {
        console.log('Shared lists directory already exists');
      });

      const filePath = `${tempDir}${filename}`;

      // Write the markdown content to the file
      await FileSystem.writeAsStringAsync(filePath, markdown, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('Created markdown file at:', filePath);

      // Share the file
      await Share.share({
        url: filePath,
        title: filename,
      });
    } catch (error) {
      console.error('Error sharing list:', error);
    }
  };

  const handleMenuPress = (event: any) => {
    const { nativeEvent } = event;
    if (nativeEvent.actionKey === 'delete') {
      deleteList(list.id);
    } else if (nativeEvent.actionKey === 'share') {
      shareList();
    }
  };

  const CheckboxComponent = ({
    item,
    itemIndex,
  }: {
    item: any;
    itemIndex: number;
  }) => {
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
      toggleTodo(list.id, item.id);
    };

    return (
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
    );
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
    <Animated.View
      style={[styles.container, animatedStyle]}
      ref={parentAnimatedRef}
      layout={LinearTransition}
      entering={FadeInUp}
    >
      <ContextMenuView
        style={[{ width, borderRadius: 16 }]}
        previewConfig={{
          previewWidth: width,
          borderRadius: 16,
        }}
        menuConfig={{
          menuTitle: list.name,
          menuItems: [
            {
              actionKey: 'share',
              actionTitle: 'Share List',
              icon: {
                type: 'IMAGE_SYSTEM',
                imageValue: {
                  systemName: 'square.and.arrow.up',
                },
              },
            },
            {
              actionKey: 'delete',
              actionTitle: 'Delete List',
              icon: {
                type: 'IMAGE_SYSTEM',
                imageValue: {
                  systemName: 'trash',
                },
              },
              menuAttributes: ['destructive'],
            },
          ],
        }}
        onPressMenuItem={handleMenuPress}
      >
        <Pressable
          style={[{ width }]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isExpanded}
        >
          <Animated.View
            style={[
              styles.card,
              {
                width,
                minHeight: width, // 1:1 aspect ratio
                backgroundColor: '#ffed85',
              },
              cardAnimatedStyle,
            ]}
            ref={animatedRef}
          >
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>
                {list.name}
              </Text>
              {list.items.length > 0 && (
                <Text style={styles.todoCount}>
                  {list.items.filter((item) => !item.completed).length}
                </Text>
              )}
              {/* <Animated.View ref={editButtonRef}>
                <Pressable style={styles.editButton} onPress={handleEditPress}>
                  <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
                </Pressable>
              </Animated.View> */}
            </View>

            <View style={styles.itemsList}>
              {list.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <Animated.View
                    layout={LinearTransition}
                    style={styles.itemRow}
                  >
                    <View style={{ width: 16, paddingRight: 4, paddingTop: 3 }}>
                      <Text
                        style={{
                          fontSize: 8,
                          color: '#666',
                          textAlign: 'right',
                        }}
                      >
                        •
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.itemText,
                        item.completed && styles.itemTextCompleted,
                      ]}
                    >
                      {item.text}
                    </Text>
                    <CheckboxComponent item={item} itemIndex={itemIndex} />
                  </Animated.View>
                  {item.dueDate && (
                    <View style={styles.cardDueDateRow}>
                      <Text style={styles.cardDueDateText}>
                        {formatDueDate(item.dueDate).dateText}
                      </Text>
                      <Text
                        style={[
                          styles.cardDaysAwayText,
                          formatDueDate(item.dueDate).isPastDue &&
                            styles.cardPastDueText,
                        ]}
                      >
                        {formatDueDate(item.dueDate).daysText}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      </ContextMenuView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    overflow: 'hidden',
    borderRadius: 16,
  },
  cardDueDateRow: {
    paddingLeft: 20,
    paddingTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDueDateText: {
    fontSize: 8,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  cardDaysAwayText: {
    fontSize: 8,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  cardPastDueText: {
    color: '#ef4444', // red-500
  },
  card: {
    borderRadius: 16,
    // padding: 16,
    paddingVertical: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 16,
  },
  todoCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.6)',
    marginRight: 16,
  },
  editButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsList: {},
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginLeft: 8,
    marginTop: 3,
    marginRight: 16,
  },
  checkboxCompleted: {
    // backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80', // green-400
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
  itemText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
  },
  itemTextCompleted: {
    color: 'rgba(0, 0, 0, 0.3)',
  },
});
