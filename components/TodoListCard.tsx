import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  measure,
  runOnJS,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { TodoList } from '../store/todoStore';

interface TodoListCardProps {
  list: TodoList;
  size: number;
  isExpanded: boolean;
  onPress: (position: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
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
  size,
  isExpanded,
  onPress,
  onDismiss,
  onEdit,
  index,
}: TodoListCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const cardRef = useRef<Pressable>(null);

  const animatedRef = useAnimatedRef();
  const editButtonRef = useAnimatedRef();

  useEffect(() => {
    if (isExpanded) {
      opacity.value = 0;
    } else {
      opacity.value = 1;
    }
  }, [isExpanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    runOnUI(() => {
      const measurement = measure(animatedRef);

      if (measurement === null) {
        return;
      }

      runOnJS(onPress)({
        x: measurement.pageX,
        y: measurement.pageY,
        width: measurement.width,
        height: measurement.height,
      });
    })();
  };

  const handleEditPress = (e: any) => {
    e.stopPropagation();

    runOnUI(() => {
      const measurement = measure(editButtonRef);

      if (measurement === null) {
        return;
      }

      runOnJS(onEdit)(list.id, {
        x: measurement.pageX,
        y: measurement.pageY,
        width: measurement.width,
        height: measurement.height,
      });
    })();
  };

  return (
    <Animated.View
      style={[styles.container, { width: size, height: size }, animatedStyle]}
      ref={animatedRef}
    >
      <Pressable
        ref={cardRef}
        style={[
          styles.card,
          { width: size, height: size, backgroundColor: list.color || '#fff' },
        ]}
        onPress={handlePress}
        disabled={isExpanded}
      >
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {list.name}
          </Text>
          <Animated.View ref={editButtonRef}>
            <Pressable style={styles.editButton} onPress={handleEditPress}>
              <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.itemsList}>
          {list.items.slice(0, 3).map((item, itemIndex) => (
            <View key={itemIndex} style={styles.itemRow}>
              <View
                style={[
                  styles.checkbox,
                  item.completed && styles.checkboxCompleted,
                ]}
              />
              <Text
                style={[
                  styles.itemText,
                  item.completed && styles.itemTextCompleted,
                ]}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </View>
          ))}
          {list.items.length > 3 && (
            <Text style={styles.moreItems}>+{list.items.length - 3} more</Text>
          )}
        </View>
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
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
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
  itemsList: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    marginRight: 8,
  },
  checkboxCompleted: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  itemText: {
    fontSize: 18,
    color: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(0, 0, 0, 0.4)',
  },
  moreItems: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.4)',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
