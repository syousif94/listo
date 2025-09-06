import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useEffect, useRef } from 'react';
import { AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { eventEmitter } from '../services/eventEmitter';
import { useAuthStore } from '../store/authStore';
import { RecordingState, useRecordingStore } from '../store/recordingStore';
import DateTimePicker from './DateTimePicker';
import LoginButton from './LoginButton';
import RecordingButton from './RecordingButton';
import SettingsPage from './SettingsPage';
import TodoGrid from './TodoGrid';

export default function TodoApp() {
  const window = useWindowDimensions();
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  // Auth state from store
  const {
    isAuthenticated,
    isInitialized,
    initializeAuth,
    checkAppleCredentialState,
  } = useAuthStore();

  // Recording state from store (only read when needed)
  const recordingState = useRecordingStore((state) => state.recordingState);

  // Scroll position tracking
  const scrollX = useSharedValue(0);
  const recordingButtonOpacity = useSharedValue(1);

  // Screen width as shared value for reanimated context
  const screenWidth = useSharedValue(window.width);

  // Update screen width when window dimensions change
  useEffect(() => {
    screenWidth.value = window.width;
  }, [window.width, screenWidth]);

  // Opacity based on scroll position - starts fading immediately when scrolling
  const scrollBasedOpacity = useDerivedValue(() => {
    // Calculate opacity based on scroll position
    // Fade from 1 to 0 as we scroll from 0 to screenWidth/2 (half screen width)
    const progress = scrollX.value / (screenWidth.value / 2);
    return Math.max(0, 1 - progress);
  });

  // Update recording button opacity based on scroll position and recording state
  useDerivedValue(() => {
    const isRecording =
      recordingState === RecordingState.LISTENING ||
      recordingState === RecordingState.PROCESSING;

    if (isRecording) {
      // Always visible when recording
      recordingButtonOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Use scroll-based opacity for smooth fading
      recordingButtonOpacity.value = withTiming(scrollBasedOpacity.value, {
        duration: 100,
      });
    }
  });

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Event emitter listener for scroll to page
  useEffect(() => {
    const handleScrollToPage = (pageIndex: number) => {
      const targetX = pageIndex * window.width;
      scrollViewRef.current?.scrollTo({ x: targetX, animated: true });
    };

    eventEmitter.on('scrollToPage', handleScrollToPage);

    return () => {
      eventEmitter.off('scrollToPage', handleScrollToPage);
    };
  }, [window.width]);

  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Check Apple credential state when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('App became active, checking Apple credential state');
        checkAppleCredentialState();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, [checkAppleCredentialState]);

  // Shared values for editor popup positioning
  const editorAnchorX = useSharedValue(0);
  const editorAnchorY = useSharedValue(0);
  const editorAnchorWidth = useSharedValue(0);
  const editorAnchorHeight = useSharedValue(0);

  const handleEditList = (
    listId: string,
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ) => {
    // _setEditingListId(listId);
    if (position) {
      editorAnchorX.value = position.x;
      editorAnchorY.value = position.y;
      editorAnchorWidth.value = position.width;
      editorAnchorHeight.value = position.height;
    }
    // setShowListEditor(true);
  };

  const pageStyle = {
    width: window.width,
    height: window.height,
  };

  // Animated style for recording button
  const recordingButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: recordingButtonOpacity.value,
    pointerEvents: recordingButtonOpacity.value > 0 ? 'auto' : 'none',
  }));

  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
        },
      ]}
    >
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={[styles.viewContainer, pageStyle]}>
          <TodoGrid onEditList={handleEditList} />
        </View>
        <View style={[styles.viewContainer, pageStyle]}>
          <SettingsPage />
        </View>
      </Animated.ScrollView>

      {isInitialized &&
        (isAuthenticated ? (
          <Animated.View
            style={[
              recordingButtonAnimatedStyle,
              { position: 'absolute', bottom: 0, left: 0, right: 0 },
            ]}
          >
            <RecordingButton />
          </Animated.View>
        ) : (
          <LoginButton />
        ))}

      {/* Global Date Time Picker */}
      <DateTimePicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  viewContainer: {
    flex: 1,
  },
});
