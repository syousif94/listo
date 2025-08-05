import { MasonryFlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TodoList, useTodoStore } from '../store/todoStore';
import ExpandedTodoCard from './ExpandedTodoCard';
import TodoListCard from './TodoListCard';

function createTypedMasonryList<T>() {
  return Animated.createAnimatedComponent(MasonryFlashList<T>);
}

const ListsMasonryList = createTypedMasonryList<TodoList>();

const CARD_MARGIN = 12;
const CARDS_PER_ROW = 2;

interface TodoGridProps {
  onEditList: (
    listId: string,
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => void;
}

export default function TodoGrid({ onEditList }: TodoGridProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const lists = useTodoStore((state) => state.lists);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  // Calculate dynamic card width
  const cardWidth = (width - CARD_MARGIN * (CARDS_PER_ROW + 1)) / CARDS_PER_ROW;

  // Use shared values for card position
  const cardX = useSharedValue(0);
  const cardY = useSharedValue(0);
  const animatedCardWidth = useSharedValue(0);
  const animatedCardHeight = useSharedValue(0);

  // Use shared values for normal (dismiss) position
  const normalCardX = useSharedValue(0);
  const normalCardY = useSharedValue(0);
  const normalCardWidth = useSharedValue(0);
  const normalCardHeight = useSharedValue(0);

  const handleCardPress = (
    listId: string,
    scaledPosition: { x: number; y: number; width: number; height: number },
    normalPosition: { x: number; y: number; width: number; height: number }
  ) => {
    // Update shared values for scaled position (animation start)
    cardX.value = scaledPosition.x;
    cardY.value = scaledPosition.y;
    animatedCardWidth.value = scaledPosition.width;
    animatedCardHeight.value = scaledPosition.height;

    // Update shared values for normal position (dismiss target)
    normalCardX.value = normalPosition.x;
    normalCardY.value = normalPosition.y;
    normalCardWidth.value = normalPosition.width;
    normalCardHeight.value = normalPosition.height;

    setExpandedListId(listId);
  };

  const handleCardDismiss = () => {
    setExpandedListId(null);
  };

  const handleEditList = (
    listId: string,
    position: { x: number; y: number; width: number; height: number }
  ) => {
    onEditList(listId, position);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isExpanded = expandedListId === item.id;

    return (
      <TodoListCard
        list={item}
        width={cardWidth}
        isExpanded={isExpanded}
        onPress={(scaledPosition, normalPosition) =>
          handleCardPress(item.id, scaledPosition, normalPosition)
        }
        onDismiss={handleCardDismiss}
        onEdit={handleEditList}
        index={index}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ListsMasonryList
        data={lists}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={expandedListId}
        numColumns={CARDS_PER_ROW}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 120,
          paddingLeft: 6.5,
        }}
        scrollEnabled={!expandedListId}
      />

      {expandedListId && (
        <ExpandedTodoCard
          listId={expandedListId}
          onDismiss={handleCardDismiss}
          onEditList={onEditList}
          initialX={cardX}
          initialY={cardY}
          initialWidth={animatedCardWidth}
          initialHeight={animatedCardHeight}
          normalX={normalCardX}
          normalY={normalCardY}
          normalWidth={normalCardWidth}
          normalHeight={normalCardHeight}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
