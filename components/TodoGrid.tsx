import React, { useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTodoStore } from '../store/todoStore';
import ExpandedTodoCard from './ExpandedTodoCard';
import TodoListCard from './TodoListCard';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 20;
const CARDS_PER_ROW = 2;
const CARD_SIZE = (width - CARD_MARGIN * (CARDS_PER_ROW + 1)) / CARDS_PER_ROW;

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

  const handleCardPress = (
    listId: string,
    position: { x: number; y: number; width: number; height: number }
  ) => {
    // Update shared values instead of state
    cardX.value = position.x;
    cardY.value = position.y;
    cardWidth.value = position.width;
    cardHeight.value = position.height;
    setExpandedListId(listId);
  };

  const handleCardDismiss = () => {
    setExpandedListId(null);
  };

  const handleEditList = (listId: string) => {
    onEditList(listId);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isExpanded = expandedListId === item.id;

    return (
      <TodoListCard
        list={item}
        size={CARD_SIZE}
        isExpanded={isExpanded}
        onPress={(position) => handleCardPress(item.id, position)}
        onDismiss={handleCardDismiss}
        onEdit={() => handleEditList(item.id)}
        index={index}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={CARDS_PER_ROW}
        contentContainerStyle={[
          styles.grid,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom,
          },
        ]}
        columnWrapperStyle={styles.row}
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    padding: CARD_MARGIN,
  },
  row: {
    justifyContent: 'space-between',
  },
});
