import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  FlatList,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTodoStore } from '../store/todoStore';

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
}

export default function ExpandedTodoCard({
  listId,
  onDismiss,
  onEditList,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
}: ExpandedTodoCardProps) {
  const list = useTodoStore((state) =>
    state.lists.find((l) => l.id === listId)
  );
  const toggleTodo = useTodoStore((state) => state.toggleTodo);

  const scale = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const borderRadius = useSharedValue(12);
  const cardWidth = useSharedValue(0);
  const cardHeight = useSharedValue(0);
  const animationProgress = useSharedValue(0); // 0 = card state, 1 = expanded state

  useEffect(() => {
    // Start from grid item position and size using shared values
    translateX.value = initialX.value;
    translateY.value = initialY.value;
    cardWidth.value = initialWidth.value;
    cardHeight.value = initialHeight.value;
    borderRadius.value = 12;
    animationProgress.value = 0;
    opacity.value = 1;

    // Animate to full screen
    translateX.value = withSpring(0, { damping: 16, stiffness: 120 });
    translateY.value = withSpring(0, { damping: 16, stiffness: 120 });
    cardWidth.value = withSpring(width, { damping: 16, stiffness: 120 });
    cardHeight.value = withSpring(height, { damping: 16, stiffness: 120 });
    animationProgress.value = withSpring(1, { damping: 16, stiffness: 120 });
    // Animate border radius to 0 only when fully expanded
    borderRadius.value = withSpring(0, { damping: 16, stiffness: 120 });
  }, []);

  const dismiss = () => {
    // Animate back to grid item position and size using shared values
    translateX.value = withSpring(initialX.value, {
      damping: 16,
      stiffness: 120,
    });
    translateY.value = withSpring(initialY.value, {
      damping: 16,
      stiffness: 120,
    });
    cardWidth.value = withSpring(initialWidth.value, {
      damping: 16,
      stiffness: 120,
    });
    cardHeight.value = withSpring(initialHeight.value, {
      damping: 16,
      stiffness: 120,
    });
    animationProgress.value = withSpring(
      0,
      { damping: 16, stiffness: 120 },
      () => {
        runOnJS(onDismiss)();
      }
    );
    // Animate border radius back to 12 when dismissing
    borderRadius.value = withSpring(12, { damping: 16, stiffness: 120 });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      // Follow the drag directly
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      // Calculate progress based on drag distance
      const distance = Math.sqrt(
        Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
      );
      const maxDistance = 500;
      const progress = Math.max(0, 1 - distance / maxDistance);

      animationProgress.value = progress;

      // Interpolate size and border radius based on progress
      cardWidth.value = interpolate(
        progress,
        [0, 1],
        [initialWidth.value, width],
        Extrapolation.CLAMP
      );
      cardHeight.value = interpolate(
        progress,
        [0, 1],
        [initialHeight.value, height],
        Extrapolation.CLAMP
      );

      // Keep border radius at 12 when dragging
      borderRadius.value = 12;
    })
    .onEnd((event) => {
      'worklet';
      const distance = Math.sqrt(
        Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
      );

      const shouldDismiss =
        distance > 150 ||
        Math.abs(event.velocityX) > 500 ||
        Math.abs(event.velocityY) > 500;

      if (shouldDismiss) {
        // Animate to grid position with overshoot then settle
        translateX.value = withSpring(initialX.value, {
          damping: 16,
          stiffness: 120,
        });
        translateY.value = withSpring(
          initialY.value,
          { damping: 16, stiffness: 120 },
          () => {
            runOnJS(onDismiss)();
          }
        );
        cardWidth.value = withSpring(initialWidth.value, {
          damping: 16,
          stiffness: 120,
        });
        cardHeight.value = withSpring(initialHeight.value, {
          damping: 16,
          stiffness: 120,
        });
        animationProgress.value = withSpring(0, {
          damping: 16,
          stiffness: 120,
        });
        // Keep border radius at 12 when dismissing
        borderRadius.value = withSpring(12, { damping: 16, stiffness: 120 });
      } else {
        // Snap back to full screen with spring
        translateX.value = withSpring(0, { damping: 16, stiffness: 140 });
        translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
        cardWidth.value = withSpring(width, { damping: 16, stiffness: 120 });
        cardHeight.value = withSpring(height, { damping: 16, stiffness: 120 });
        animationProgress.value = withSpring(1, {
          damping: 16,
          stiffness: 120,
        });
        // Animate border radius back to 0 when snapping back to full screen
        borderRadius.value = withSpring(0, { damping: 16, stiffness: 120 });
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
      [list?.color || '#fff', '#fff']
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

  const renderTodoItem = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.todoItem, item.completed && styles.completedTodo]}
      onPress={() => toggleTodo(listId, item.id)}
    >
      <Text style={[styles.todoText, item.completed && styles.completedText]}>
        {item.text}
      </Text>
    </Pressable>
  );

  const handleEditPress = () => {
    // Use the screen center for expanded card editor
    onEditList(listId, {
      x: 300, // Approximate position for expanded card
      y: 100,
      width: 24,
      height: 24,
    });
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
              <View style={styles.cardEditButton}>
                <Text style={styles.cardEditIcon}>⋯</Text>
              </View>
            </View>

            <View style={styles.cardItemsList}>
              {list.items.slice(0, 3).map((item, itemIndex) => (
                <View key={itemIndex} style={styles.cardItemRow}>
                  <View
                    style={[
                      styles.cardCheckbox,
                      item.completed && styles.cardCheckboxCompleted,
                    ]}
                  />
                  <Text
                    style={[
                      styles.cardItemText,
                      item.completed && styles.cardItemTextCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {item.text}
                  </Text>
                </View>
              ))}
              {list.items.length > 3 && (
                <Text style={styles.cardMoreItems}>
                  +{list.items.length - 3} more
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Expanded content (visible when expanded) */}
          <Animated.View style={[styles.expandedContent, contentOpacity]}>
            <View style={styles.header}>
              <Text style={styles.title}>{list.name}</Text>
              <View style={styles.headerButtons}>
                <Pressable onPress={handleEditPress} style={styles.editButton}>
                  <Text style={styles.editText}>⋯</Text>
                </Pressable>
                <Pressable onPress={dismiss} style={styles.closeButton}>
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>
            </View>
            <FlatList
              data={list.items}
              renderItem={renderTodoItem}
              keyExtractor={(item) => item.id}
              style={styles.todoList}
              contentContainerStyle={styles.todoListContent}
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
    justifyContent: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
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
  cardItemsList: {
    flex: 1,
  },
  cardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCheckbox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginRight: 8,
  },
  cardCheckboxCompleted: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  cardItemText: {
    fontSize: 18,
    color: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
  },
  cardItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(0, 0, 0, 0.4)',
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
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#666',
  },
  todoList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  todoListContent: {
    padding: 20,
  },
  todoItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  completedTodo: {
    backgroundColor: '#e8f5e8',
  },
  todoText: {
    fontSize: 16,
    color: '#333',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
});
