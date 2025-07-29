import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TodoItem, useTodoStore } from '../store/todoStore';
import AutoSizingTextInput from './AutoSizingTextInput';

const { width, height } = Dimensions.get('window');

interface ExpandedTodoCardProps {
  listId: string;
  onDismiss: () => void;
  onEditList: (
    listId: string,
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => void;
  initialX: SharedValue<number>;
  initialY: SharedValue<number>;
  initialWidth: SharedValue<number>;
  initialHeight: SharedValue<number>;
  normalX: SharedValue<number>;
  normalY: SharedValue<number>;
  normalWidth: SharedValue<number>;
  normalHeight: SharedValue<number>;
}

export default function ExpandedTodoCard({
  listId,
  onDismiss,
  onEditList,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  normalX,
  normalY,
  normalWidth,
  normalHeight,
}: ExpandedTodoCardProps) {
  const list = useTodoStore((state) =>
    state.lists.find((l) => l.id === listId)
  );
  const toggleTodo = useTodoStore((state) => state.toggleTodo);
  const updateTodo = useTodoStore((state) => state.updateTodo);
  const addTodoToList = useTodoStore((state) => state.addTodoToList);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();

  // State for managing newly created items that need focus
  const [newlyCreatedItemId, setNewlyCreatedItemId] = useState<string | null>(
    null
  );
  const inputRefs = useRef<Map<string, TextInput>>(new Map());
  const flatListRef = useAnimatedRef<Animated.FlatList<TodoItem>>();

  const footerHeight = useSharedValue(windowDimensions.height * 0.7); // 70% of window height

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const borderRadius = useSharedValue(12);
  const cardWidth = useSharedValue(0);
  const cardHeight = useSharedValue(0);
  const animationProgress = useSharedValue(0); // 0 = card state, 1 = expanded state

  // Update footer height when window dimensions change
  useEffect(() => {
    footerHeight.value = windowDimensions.height * 0.7;
  }, [windowDimensions.height, footerHeight]);

  // Clean up refs when items are removed
  useEffect(() => {
    if (list) {
      const currentItemIds = new Set(list.items.map((item) => item.id));
      const refsToDelete: string[] = [];

      inputRefs.current.forEach((_, itemId) => {
        if (!currentItemIds.has(itemId)) {
          refsToDelete.push(itemId);
        }
      });

      refsToDelete.forEach((itemId) => {
        inputRefs.current.delete(itemId);
      });
    }
  }, [list]);

  useEffect(() => {
    // Start from grid item position and size using shared values
    translateX.value = initialX.value;
    translateY.value = initialY.value;
    cardWidth.value = initialWidth.value;
    cardHeight.value = initialHeight.value;
    borderRadius.value = 12;
    animationProgress.value = 0;
    opacity.value = 1;

    // Calculate expanded dimensions with only top safe area inset
    const expandedWidth = width; // Full width
    const expandedHeight = height - insets.top; // Only subtract top safe area
    const expandedX = 0; // Full width from edge
    const expandedY = insets.top; // Just under status bar

    // Animate to card-like expanded state
    translateX.value = withSpring(expandedX, { damping: 16, stiffness: 120 });
    translateY.value = withSpring(expandedY, { damping: 16, stiffness: 120 });
    cardWidth.value = withSpring(expandedWidth, {
      damping: 16,
      stiffness: 120,
    });
    cardHeight.value = withSpring(expandedHeight, {
      damping: 16,
      stiffness: 120,
    });
    animationProgress.value = withSpring(1, { damping: 16, stiffness: 120 });
    // Keep border radius when expanded to maintain card appearance
    borderRadius.value = withSpring(24, { damping: 16, stiffness: 120 });
  }, [
    initialX.value,
    initialY.value,
    initialWidth.value,
    initialHeight.value,
    translateX,
    translateY,
    cardWidth,
    cardHeight,
    borderRadius,
    animationProgress,
    opacity,
    insets.top,
    insets.bottom,
  ]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      // Calculate expanded dimensions with only top safe area inset
      const expandedWidth = width;
      const expandedHeight = height - insets.top;
      const expandedX = 0;
      const expandedY = insets.top;

      // Follow the drag directly from expanded position
      translateX.value = expandedX + event.translationX;
      translateY.value = expandedY + event.translationY;

      // Calculate progress based on drag distance
      const distance = Math.sqrt(
        Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
      );
      const maxDistance = 500;
      const progress = Math.max(0, 1 - distance / maxDistance);

      animationProgress.value = progress;

      // Interpolate size based on progress
      cardWidth.value = interpolate(
        progress,
        [0, 1],
        [normalWidth.value, expandedWidth],
        Extrapolation.CLAMP
      );
      cardHeight.value = interpolate(
        progress,
        [0, 1],
        [normalHeight.value, expandedHeight],
        Extrapolation.CLAMP
      );

      // Interpolate border radius based on progress
      borderRadius.value = interpolate(
        progress,
        [0, 1],
        [16, 24],
        Extrapolation.CLAMP
      );
    })
    .onEnd((event) => {
      'worklet';
      // Calculate expanded dimensions with only top safe area inset
      const expandedWidth = width;
      const expandedHeight = height - insets.top;
      const expandedX = 0;
      const expandedY = insets.top;

      const distance = Math.sqrt(
        Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
      );

      const shouldDismiss =
        distance > 150 ||
        Math.abs(event.velocityX) > 500 ||
        Math.abs(event.velocityY) > 500;

      if (shouldDismiss) {
        // Animate to normal card position with overshoot then settle
        translateX.value = withSpring(normalX.value, {
          damping: 16,
          stiffness: 120,
        });
        translateY.value = withSpring(
          normalY.value,
          { damping: 16, stiffness: 120 },
          () => {
            runOnJS(onDismiss)();
          }
        );
        cardWidth.value = withSpring(normalWidth.value, {
          damping: 16,
          stiffness: 120,
        });
        cardHeight.value = withSpring(normalHeight.value, {
          damping: 16,
          stiffness: 120,
        });
        animationProgress.value = withSpring(0, {
          damping: 16,
          stiffness: 120,
        });
        // Keep border radius at 16 when dismissing
        borderRadius.value = withSpring(16, { damping: 16, stiffness: 120 });
      } else {
        // Snap back to expanded card position with spring
        translateX.value = withSpring(expandedX, {
          damping: 16,
          stiffness: 140,
        });
        translateY.value = withSpring(expandedY, {
          damping: 16,
          stiffness: 140,
        });
        cardWidth.value = withSpring(expandedWidth, {
          damping: 16,
          stiffness: 120,
        });
        cardHeight.value = withSpring(expandedHeight, {
          damping: 16,
          stiffness: 120,
        });
        animationProgress.value = withSpring(1, {
          damping: 16,
          stiffness: 120,
        });
        // Keep border radius at 24 when snapping back to expanded state
        borderRadius.value = withSpring(24, { damping: 16, stiffness: 120 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: translateX.value,
    top: translateY.value,
    width: cardWidth.value,
    height: cardHeight.value,
    borderRadius: borderRadius.value,
    backgroundColor: interpolateColor(
      animationProgress.value,
      [0, 1],
      ['#ffed85', '#fff']
    ),
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value * 0.5,
  }));

  const contentOpacity = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
  }));

  const cardContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animationProgress.value, [0, 0.3], [1, 0]),
  }));

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
      toggleTodo(listId, item.id);
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

  const renderTodoItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <Animated.View>
        <View style={styles.itemRow}>
          <AutoSizingTextInput
            ref={(ref) => {
              if (ref) {
                inputRefs.current.set(item.id, ref);
                // Auto-focus if this is the newly created item
                if (newlyCreatedItemId === item.id) {
                  setTimeout(() => {
                    ref.focus();
                    setNewlyCreatedItemId(null); // Clear after focusing
                  }, 100);
                }
              }
            }}
            style={[
              styles.itemText,
              item.completed && styles.itemTextCompleted,
            ]}
            value={item.text}
            onChangeText={(text: string) => {
              updateTodo(listId, item.id, { text });
            }}
            onBlur={() => {
              // Delete the todo if it's empty when blurred
              const trimmedText = item.text.trim();
              if (trimmedText === '') {
                deleteTodo(listId, item.id);
              }
            }}
            minHeight={22}
          />
          <CheckboxComponent item={item} itemIndex={index} />
        </View>
      </Animated.View>
    );
  };

  const handleAddNewTodo = () => {
    addTodoToList(listId, '');

    // Find the newly created item (it will be the last one)
    const timeoutId = setTimeout(() => {
      const currentList = useTodoStore
        .getState()
        .lists.find((l) => l.id === listId);
      if (currentList && currentList.items.length > 0) {
        const lastItem = currentList.items[currentList.items.length - 1];
        setNewlyCreatedItemId(lastItem.id);
      }
    }, 50); // Small delay to ensure the item is added

    // Cleanup timeout if component unmounts
    return () => clearTimeout(timeoutId);
  };

  const animatedFooterStyle = useAnimatedStyle(() => ({
    height: footerHeight.value,
  }));

  const addTodoPressableStyle = useAnimatedStyle(() => ({
    paddingBottom: 50 + insets.bottom + 40, // Reduced from 100 to 50 to move text down 50px
  }));

  const renderFooter = () => (
    <Animated.View style={[styles.addTodoArea, animatedFooterStyle]}>
      <Animated.View style={[styles.addTodoPressable, addTodoPressableStyle]}>
        <Pressable
          style={styles.addTodoFillPressable}
          onPress={handleAddNewTodo}
        ></Pressable>
      </Animated.View>
    </Animated.View>
  );

  if (!list) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, animatedStyle]}>
          {/* Card content (visible when collapsed) - matches TodoListCard */}
          <Animated.View style={[styles.cardContent, cardContentStyle]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {list.name}
              </Text>
            </View>

            <View style={styles.cardItemsList}>
              {list.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.cardItemRow}>
                  <Text
                    style={[
                      styles.cardItemText,
                      item.completed && styles.cardItemTextCompleted,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <View
                    style={[
                      styles.cardCheckbox,
                      item.completed && styles.cardCheckboxCompleted,
                    ]}
                  >
                    {item.completed && <View style={styles.cardCheckboxDot} />}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Expanded content (visible when expanded) */}
          <Animated.View style={[styles.expandedContent, contentOpacity]}>
            {/* <View style={styles.header}>
              <Pressable onPress={dismiss} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
              </Pressable>
              <AutoSizingTextInput
                style={styles.title}
                value={list.name}
                onChangeText={(text: string) => {
                  updateList(listId, { name: text });
                }}
                minHeight={24}
                multiline={false}
                placeholder="List title"
              />
            </View> */}
            <Animated.FlatList
              ref={flatListRef}
              data={list.items}
              renderItem={({ item, index }) => renderTodoItem({ item, index })}
              keyExtractor={(item) => item.id}
              style={styles.todoList}
              contentContainerStyle={styles.todoListContent}
              ListFooterComponent={renderFooter}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
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
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 12,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  cardEditButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEditIcon: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  cardItemsList: {},
  cardItemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  cardCheckbox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginLeft: 8,
    marginTop: 3,
  },
  cardCheckboxCompleted: {
    // backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardCheckboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80', // green-400
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
  cardItemText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
  },
  cardItemTextCompleted: {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  cardMoreItems: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.4)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  expandedContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20, // Reduced since we're already accounting for safe area
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginHorizontal: 16,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    fontSize: 16,
    color: '#666',
  },
  todoList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  todoListContent: {
    padding: 20,
  },
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
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
  },
  itemTextCompleted: {
    color: 'rgba(0, 0, 0, 0.3)',
  },
  addTodoArea: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  addTodoPressable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addTodoFillPressable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addTodoFillSpace: {
    flex: 1,
  },
  addTodoTextContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  addTodoText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
