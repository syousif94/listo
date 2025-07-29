import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
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
          x: normalMeasurement.pageX,
          y: normalMeasurement.pageY,
          width: normalMeasurement.width,
          height: normalMeasurement.height,
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

  return (
    <Animated.View
      style={[styles.container, { width }, animatedStyle]}
      ref={parentAnimatedRef}
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
            {/* <Animated.View ref={editButtonRef}>
              <Pressable style={styles.editButton} onPress={handleEditPress}>
                <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
              </Pressable>
            </Animated.View> */}
          </View>

          <View style={styles.itemsList}>
            {list.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.itemRow}>
                <Text
                  style={[
                    styles.itemText,
                    item.completed && styles.itemTextCompleted,
                  ]}
                >
                  {item.text}
                </Text>
                <CheckboxComponent item={item} itemIndex={itemIndex} />
              </View>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 12,
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
    marginRight: 8,
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
