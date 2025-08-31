import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import {
  PixelRatio,
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
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTodoStore } from '../store/todoStore';
import KeyboardAccessoryView from './KeyboardAccessoryView';
import NewTodoInput from './NewTodoInput';
import TodoItemComponent from './TodoItem';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

function ExpandedTodoCard({
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
  const ACCESSORY_VIEW_ID = `accessory-${listId}`;
  const { height, width } = useWindowDimensions();
  const list = useTodoStore((state) =>
    state.lists.find((l) => l.id === listId)
  );
  const deleteTodo = useTodoStore((state) => state.deleteTodo);
  const updateList = useTodoStore((state) => state.updateList);
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();

  // State for managing newly created items that need focus
  const inputRefs = useRef<Map<string, TextInput>>(new Map());
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const footerHeight = useSharedValue(windowDimensions.height * 0.7); // 70% of window height

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const borderRadius = useSharedValue(12);
  const cardWidth = useSharedValue(0);
  const cardHeight = useSharedValue(0);
  const animationProgress = useSharedValue(0); // 0 = card state, 1 = expanded state

  // Header button animation states
  const headerScale = useSharedValue(1);
  const headerTextOpacity = useSharedValue(1);
  const backButtonScale = useSharedValue(1);
  const backButtonOpacity = useSharedValue(1);
  const scrollY = useSharedValue(0);

  // Scroll handler for header scaling
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, width, insets.top]);

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

  const animatedFooterStyle = useAnimatedStyle(() => ({
    height: footerHeight.value,
  }));

  // Header animated styles
  const headerContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: scale * headerScale.value }],
    };
  });

  const headerBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      scrollY.value,
      [0, 100],
      ['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.1)']
    ),
    shadowColor: interpolateColor(
      scrollY.value,
      [0, 100],
      ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 1)']
    ),
  }));

  const headerTextStyle = useAnimatedStyle(() => ({
    opacity: headerTextOpacity.value,
  }));

  const backButtonStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: -10 }, // Offset to maintain left alignment during scale
        { scale: scale * backButtonScale.value },
        { translateX: 10 },
      ],
      opacity: backButtonOpacity.value,
    };
  });

  const backButtonBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      scrollY.value,
      [0, 100],
      ['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.1)']
    ),
    shadowColor: interpolateColor(
      scrollY.value,
      [0, 100],
      ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 1)']
    ),
  }));

  const renderFooter = () => (
    <Animated.View style={[styles.addTodoArea, animatedFooterStyle]}>
      <NewTodoInput
        listId={listId}
        showEmptyState={list?.items.length === 0}
        inputAccessoryViewID={ACCESSORY_VIEW_ID}
      />
    </Animated.View>
  );

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
              {list.items.length > 0 && (
                <Text style={styles.todoCount}>
                  {list.items.filter((item) => !item.completed).length}
                </Text>
              )}
            </View>

            <View style={styles.cardItemsList}>
              {list.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <View style={styles.cardItemRow}>
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
                      {item.completed && (
                        <View style={styles.cardCheckboxDot} />
                      )}
                    </View>
                  </View>
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

          {/* Expanded content (visible when expanded) */}
          <Animated.View style={[styles.expandedContent, contentOpacity]}>
            {/* Back Button */}
            <Animated.View
              style={[
                styles.backButtonContainer,
                contentOpacity,
                backButtonStyle,
              ]}
            >
              <AnimatedPressable
                onPressIn={() => {
                  backButtonScale.value = withSpring(0.95, {
                    damping: 15,
                    stiffness: 400,
                  });
                  backButtonOpacity.value = withTiming(0.6, { duration: 100 });
                }}
                onPressOut={() => {
                  backButtonScale.value = withSpring(1, {
                    damping: 15,
                    stiffness: 400,
                  });
                  backButtonOpacity.value = withTiming(1, { duration: 100 });
                }}
                onPress={() => {
                  // Animate back to normal position with spring
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
                  borderRadius.value = withSpring(16, {
                    damping: 16,
                    stiffness: 120,
                  });
                }}
                style={[styles.backButton, backButtonBorderStyle]}
              >
                <BlurView
                  intensity={80}
                  style={styles.backButtonBlur}
                  tint="light"
                >
                  <Ionicons name="chevron-back" size={20} color="#007AFF" />
                </BlurView>
              </AnimatedPressable>
            </Animated.View>

            {/* Floating Header with Text Input */}
            <Animated.View
              style={[
                styles.floatingHeaderContainer,
                contentOpacity,
                headerContainerStyle,
              ]}
            >
              <Animated.View style={[styles.floatingHeader, headerBorderStyle]}>
                <BlurView
                  intensity={80}
                  style={styles.blurContainer}
                  tint="light"
                >
                  <Animated.View style={headerTextStyle}>
                    <TextInput
                      style={styles.headerTextInput}
                      value={list?.name || ''}
                      onChangeText={(text) =>
                        updateList(listId, { name: text })
                      }
                      placeholder="List title"
                      placeholderTextColor="rgba(51, 51, 51, 0.5)"
                      multiline={false}
                      textAlign="center"
                    />
                  </Animated.View>
                </BlurView>
              </Animated.View>
            </Animated.View>

            <Animated.ScrollView
              ref={scrollViewRef}
              style={styles.todoList}
              contentContainerStyle={[
                styles.todoListContent,
                { paddingTop: 60 },
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              keyboardDismissMode="none"
              keyboardShouldPersistTaps="always"
            >
              {list.items.map((item, index) => (
                <TodoItemComponent
                  key={item.id}
                  // ref={(ref) => {
                  //   if (ref) {
                  //     inputRefs.current.set(item.id, ref);
                  //   }
                  // }}
                  item={item}
                  listId={listId}
                  onDeleteEmpty={(itemId) => deleteTodo(listId, itemId)}
                />
              ))}
              {renderFooter()}
            </Animated.ScrollView>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Keyboard Accessory View */}
      <KeyboardAccessoryView nativeID={ACCESSORY_VIEW_ID}>
        <Text style={styles.accessoryText}>Add Due Date</Text>
      </KeyboardAccessoryView>
    </View>
  );
}

export default React.memo(ExpandedTodoCard);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
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
    paddingVertical: 12,
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
    marginLeft: 16,
  },
  todoCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.6)',
    marginRight: 16,
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
    marginRight: 16,
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
  todoListContent: {},
  addTodoArea: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 12,
    left: 20,
    zIndex: 1001,
  },
  backButton: {
    borderRadius: 20,
    borderWidth: 1 / PixelRatio.get(),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  floatingHeaderContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  floatingHeader: {
    borderRadius: 20,
    borderWidth: 1 / PixelRatio.get(),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  blurContainer: {
    height: 40,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerTextInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    minWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  accessoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});
