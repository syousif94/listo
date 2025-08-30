import { MasonryFlashList } from '@shopify/flash-list';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
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

const quotes = [
  'Create a new list called Todos',
  'Add laundry, oil change, and car wash to my Todos list',
  'Remind me about laundry at 6pm',
  'Mark everything in Todos done',
  'Delete all the completed todos in the Todos list',
  'Delete the Todos list',
  'Undo that',
  'Add Data Driven Science and Engineering to my reading list',
  'Move my work list to the top',
  'Create a shopping list with white peaches, cilantro, and green onions',
  'Rename Shopping List to Groceries',
  'Move the ones with due dates to the top',
];

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
  const { width, height } = useWindowDimensions();
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
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/images/splash-icon.png')}
              style={{
                width: width,
                height: 100,
                marginTop: height * 0.2,
                alignSelf: 'center',
                resizeMode: 'contain',
              }}
            />

            <Animated.Text style={styles.titleText}>
              Welcome to Listo!
            </Animated.Text>

            <Animated.Text style={styles.emptyText}>
              Press the green button to record yourself speaking and Listo will
              turn that into lists of stuff like todos, grocery lists, recipes,
              books, movies, etc.
            </Animated.Text>

            <CyclingQuotes quotes={quotes} />
          </View>
        )}
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

function CyclingQuotes({ quotes }: { quotes: string[] }) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    const cycleToNextQuote = () => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    };

    const animateQuote = () => {
      // Reset position for new quote
      translateY.value = 10;
      opacity.value = 0;

      // Fade in
      opacity.value = withTiming(1, { duration: 500 });
      translateY.value = withTiming(0, { duration: 500 }, () => {
        opacity.value = withDelay(2100, withTiming(0, { duration: 500 }));
        translateY.value = withDelay(
          2100,
          withTiming(-20, { duration: 500 }, () => {
            runOnJS(cycleToNextQuote)();
          })
        );
      });

      // // Hold for 2.5 seconds then fade out
      // opacity.value = withDelay(
      //   2500,
      //   withTiming(0, { duration: 600 }, () => {
      //     translateY.value = withTiming(-10, { duration: 600 });
      //     runOnJS(cycleToNextQuote)();
      //   })
      // );
    };

    // Start the animation
    animateQuote();

    // Set up interval for continuous cycling
    // const interval = setInterval(() => {
    //   animateQuote();
    // }, 4000);
  }, [currentQuoteIndex]);

  return (
    <View style={styles.quoteContainer}>
      <Animated.View style={[styles.quotesView, animatedStyle]}>
        <Animated.Text style={styles.quotesText}>
          {`"${quotes[currentQuoteIndex]}"`}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    marginLeft: -CARD_MARGIN / 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 32,
    textAlign: 'center',
    alignSelf: 'center',
    marginHorizontal: 24,
    maxWidth: 480,
    marginTop: 40,
  },
  quoteContainer: {
    alignItems: 'center',
    marginTop: 60,

    height: 100,
  },
  quotesView: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingVertical: 12,
    maxWidth: 360,
  },
  quotesText: {
    fontSize: 18,
    lineHeight: 18 * 1.6,
    textAlign: 'right',
  },
});
