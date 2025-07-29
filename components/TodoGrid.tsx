import { MasonryFlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TodoList, useTodoStore } from '../store/todoStore';
import ExpandedTodoCard from './ExpandedTodoCard';
import TodoListCard from './TodoListCard';

function createTypedMasonryList<T>() {
  return Animated.createAnimatedComponent(MasonryFlashList<T>);
}

const ListsMasonryList = createTypedMasonryList<TodoList>();

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (width - CARD_MARGIN * (CARDS_PER_ROW + 1)) / CARDS_PER_ROW;

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
  const lists = useTodoStore((state) => state.lists);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  // Use shared values for card position
  const cardX = useSharedValue(0);
  const cardY = useSharedValue(0);
  const cardWidth = useSharedValue(0);
  const cardHeight = useSharedValue(0);

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
    cardWidth.value = scaledPosition.width;
    cardHeight.value = scaledPosition.height;

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
        width={CARD_WIDTH}
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
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom,
          paddingLeft: CARD_MARGIN,
          // paddingHorizontal: CARD_MARGIN,
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
          initialWidth={cardWidth}
          initialHeight={cardHeight}
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
