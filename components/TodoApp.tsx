import React, { useEffect } from 'react';
import { AppState, Dimensions, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { useAuthStore } from '../store/authStore';
import LoginButton from './LoginButton';
import RecordingButton from './RecordingButton';
import TodoGrid from './TodoGrid';

export default function TodoApp() {
  // const [_editingListId, _setEditingListId] = useState<string | null>(null);
  // const [showListEditor, setShowListEditor] = useState(false);

  // Toast state from store
  // const { toast, hideToast } = useTodoStore((state) => ({
  //   toast: state.toast,
  //   hideToast: state.hideToast,
  // }));

  // Auth state from store
  const {
    isAuthenticated,
    isInitialized,
    initializeAuth,
    checkAppleCredentialState,
  } = useAuthStore();

  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, []);

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
  }, []);

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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  return (
    <View style={styles.container}>
      {/* <AudioProcessingStatus /> */}

      {/* Toast Notification */}
      {/* <ToastNotification
        message={toast.message}
        isVisible={toast.isVisible}
        onHide={hideToast}
      /> */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        // scrollEnabled={!showListEditor}
      >
        <View style={[styles.viewContainer, pageStyle]}>
          <TodoGrid onEditList={handleEditList} />
        </View>
        {/* <View style={[styles.viewContainer, pageStyle]}>
          <DueDatesView />
        </View> */}
      </ScrollView>

      {/* Only show buttons after auth is initialized */}
      {isInitialized &&
        (isAuthenticated ? <RecordingButton /> : <LoginButton />)}

      {/* <IntroScreen /> */}

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
    backgroundColor: '#ffffff',
  },
  viewContainer: {
    flex: 1,
  },
});
