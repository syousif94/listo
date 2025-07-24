import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  PanGestureHandlerGestureEvent,
  ScrollView,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import DueDatesView from './DueDatesView';
import RecordingButton from './RecordingButton';
import TodoGrid from './TodoGrid';

export default function TodoApp() {
  const { width, height } = useWindowDimensions();

  const [currentView, setCurrentView] = useState<'grid' | 'dueDates'>('grid');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showListEditor, setShowListEditor] = useState(false);

  // Shared values for editor popup positioning
  const editorAnchorX = useSharedValue(0);
  const editorAnchorY = useSharedValue(0);
  const editorAnchorWidth = useSharedValue(0);
  const editorAnchorHeight = useSharedValue(0);

  const translateX = useSharedValue(0);

  const handleEditList = (
    listId: string,
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => {
    setEditingListId(listId);
    if (position) {
      editorAnchorX.value = position.x;
      editorAnchorY.value = position.y;
      editorAnchorWidth.value = position.width;
      editorAnchorHeight.value = position.height;
    }
    setShowListEditor(true);
  };

  const handleEditComplete = () => {
    setEditingListId(null);
    setShowListEditor(false);
  };

  const gestureHandler =
    useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
      onStart: (_, context) => {
        context.startX = translateX.value;
      },
      onActive: (event, context) => {
        translateX.value = context.startX + event.translationX;
      },
      onEnd: (event) => {
        const shouldSwipe =
          Math.abs(event.velocityX) > 500 ||
          Math.abs(event.translationX) > width / 3;

        if (shouldSwipe) {
          if (event.translationX > 0 && currentView === 'dueDates') {
            translateX.value = withSpring(0);
            runOnJS(setCurrentView)('grid');
          } else if (event.translationX < 0 && currentView === 'grid') {
            translateX.value = withSpring(-width);
            runOnJS(setCurrentView)('dueDates');
          } else {
            translateX.value = withSpring(currentView === 'grid' ? 0 : -width);
          }
        } else {
          translateX.value = withSpring(currentView === 'grid' ? 0 : -width);
        }
      },
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const pageStyle = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        scrollEnabled={!showListEditor}
      >
        <View style={[styles.viewContainer, pageStyle]}>
          <TodoGrid onEditList={handleEditList} />
        </View>
        <View style={[styles.viewContainer, pageStyle]}>
          <DueDatesView />
        </View>
      </ScrollView>

      <RecordingButton />

      {/* <FloatingTodoInput onEditComplete={handleEditComplete} />

      {showListEditor && (
        <ListEditorPopup
          listId={editingListId}
          isVisible={showListEditor}
          onClose={handleEditComplete}
          anchorX={editorAnchorX}
          anchorY={editorAnchorY}
          anchorWidth={editorAnchorWidth}
          anchorHeight={editorAnchorHeight}
        />
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  viewContainer: {
    flex: 1,
  },
});
