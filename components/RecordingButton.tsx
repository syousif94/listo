import { AntDesign, Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import AudioRecorderPlayer, {
  RecordBackType,
} from 'react-native-audio-recorder-player';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { processRecordingComplete } from '../services/audioProcessingService';
import AudioMeter from './AudioMeter';

// Individual processing bar component
const ProcessingBar: React.FC<{
  maxHeight: number;
  color: string;
  delay: number;
}> = ({ maxHeight, color, delay }) => {
  const height = useSharedValue(2);

  React.useEffect(() => {
    // Start animation with delay
    const timer = setTimeout(() => {
      height.value = withRepeat(
        withSequence(
          withTiming(maxHeight, { duration: 600 }), // Grow to full height
          withTiming(2, { duration: 600 }) // Back to minimum
        ),
        -1, // Infinite repeat
        false // Don't reverse
      );
    }, delay);

    return () => {
      clearTimeout(timer);
      // Reset to initial state when component unmounts
      height.value = 2;
    };
  }, [delay, maxHeight, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: color,
          borderRadius: 0.5,
          width: 1,
          marginHorizontal: 2,
        },
        animatedStyle,
      ]}
    />
  );
};

// Processing animation component with 4 staggered bars
const ProcessingMeter: React.FC<{ maxHeight: number; color: string }> = ({
  maxHeight,
  color,
}) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: maxHeight,
      }}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <ProcessingBar
          key={index}
          maxHeight={maxHeight}
          color={color}
          delay={index * 200} // 200ms delay between each bar
        />
      ))}
    </View>
  );
};

// Static version of the processing meter for idle state
const StaticMeter: React.FC<{ maxHeight: number; color: string }> = ({
  maxHeight,
  color,
}) => {
  // Different heights for each bar (as percentages of maxHeight)
  const barHeights = [0.4, 0.8, 0.6, 0.9];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: maxHeight,
      }}
    >
      {barHeights.map((heightPercent, index) => (
        <View
          key={index}
          style={{
            backgroundColor: color,
            borderRadius: 0.5,
            width: 1,
            height: maxHeight * heightPercent,
            marginHorizontal: 2,
          }}
        />
      ))}
    </View>
  );
};

enum RecordingState {
  IDLE = 'idle',
  LOADING = 'loading',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  PROCESSING = 'processing',
}

interface RecordingButtonProps {
  onRecordingComplete?: (result: string) => void;
  onTranscriptionComplete?: (
    transcript: string,
    success: boolean,
    error?: string
  ) => void;
  onMeteringUpdate?: (meteringValues: number[]) => void;
  onProcessingComplete?: () => void;
  processingComplete?: boolean; // External trigger to complete processing
}

export default function RecordingButton({
  onRecordingComplete,
  onTranscriptionComplete,
  onMeteringUpdate,
  onProcessingComplete,
  processingComplete,
}: RecordingButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>(
    RecordingState.IDLE
  );
  const [meteringValues, setMeteringValues] = useState<number[]>([]);
  const [currentRecordingPath, setCurrentRecordingPath] = useState<string>('');

  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const scale = useSharedValue(1);
  const width = useSharedValue(100);
  const height = useSharedValue(54);

  // Opacity values for fade animations
  const recordViewOpacity = useSharedValue(1);
  const processingViewOpacity = useSharedValue(0);
  const recordingViewOpacity = useSharedValue(0);

  // Opacity values for pressable fade animations
  const checkButtonOpacity = useSharedValue(1);
  const closeButtonOpacity = useSharedValue(1);
  const pauseButtonOpacity = useSharedValue(1);
  const mainButtonOpacity = useSharedValue(1);

  // Animated styles for fade transitions
  const recordViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: recordViewOpacity.value,
  }));

  const processingViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: processingViewOpacity.value,
  }));

  const recordingViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: recordingViewOpacity.value,
  }));

  // Animated styles for pressable fade animations
  const checkButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkButtonOpacity.value,
  }));

  const closeButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: closeButtonOpacity.value,
  }));

  const pauseButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pauseButtonOpacity.value,
  }));

  const mainButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mainButtonOpacity.value,
  }));

  const audioRecorderPlayer = AudioRecorderPlayer;

  const handleProcessingComplete = useCallback(() => {
    setRecordingState(RecordingState.IDLE);
    // Reset metering values to empty array
    setMeteringValues([]);
    // Animate back to idle state size (100px)
    width.value = withSpring(100, {
      damping: 15,
      stiffness: 150,
    });
    height.value = withSpring(54, {
      damping: 15,
      stiffness: 150,
    });
    // Fade out processing view and fade in record view
    processingViewOpacity.value = withTiming(0, { duration: 200 });
    recordViewOpacity.value = withTiming(1, { duration: 200 });
    onProcessingComplete?.();
  }, [
    onProcessingComplete,
    width,
    height,
    processingViewOpacity,
    recordViewOpacity,
  ]);

  // Handle external processing completion
  useEffect(() => {
    if (processingComplete && recordingState === RecordingState.PROCESSING) {
      handleProcessingComplete();
    }
  }, [processingComplete, recordingState, handleProcessingComplete]);

  const onStartRecord = async () => {
    const emptyArray: number[] = [];
    for (let i = 0; i < 40; i++) {
      emptyArray.push(-160);
    }
    // Immediately set meter values to silence (-160 dB)
    setMeteringValues(emptyArray);
    onMeteringUpdate?.(emptyArray);

    // Immediately switch to recording state and show recording view
    setRecordingState(RecordingState.RECORDING);
    // Animate to expanded state with fade transitions
    width.value = withSpring(window.width - 64, {
      damping: 15,
      stiffness: 150,
    });
    height.value = withSpring(80, {
      damping: 15,
      stiffness: 150,
    });
    // Fade out record view and fade in recording view
    recordViewOpacity.value = withTiming(0, { duration: 200 });
    recordingViewOpacity.value = withTiming(1, { duration: 200 });

    try {
      const recordingPath = await audioRecorderPlayer.startRecorder(
        undefined,
        undefined,
        true
      );
      setCurrentRecordingPath(recordingPath);
      console.log('🎤 Recording started:', recordingPath);

      audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
        // Track metering values (keep last 40 values)
        if (e.currentMetering !== undefined) {
          setMeteringValues((prev) => {
            const newValues = [...prev, e.currentMetering as number];
            console.log('Metering:', e.currentMetering);
            const last40 = newValues.slice(-40); // Keep only last 40 values
            onMeteringUpdate?.(last40);
            return last40;
          });
        }
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Revert to idle state if recording fails
      setRecordingState(RecordingState.IDLE);
      width.value = withSpring(100, {
        damping: 15,
        stiffness: 150,
      });
      height.value = withSpring(54, {
        damping: 15,
        stiffness: 150,
      });
      recordingViewOpacity.value = withTiming(0, { duration: 200 });
      recordViewOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  const onPauseRecord = async () => {
    try {
      await audioRecorderPlayer.pauseRecorder();
      setRecordingState(RecordingState.PAUSED);
    } catch (error) {
      console.error('Failed to pause recording:', error);
      setRecordingState(RecordingState.RECORDING);
    }
  };

  const onResumeRecord = async () => {
    try {
      await audioRecorderPlayer.resumeRecorder();
      setRecordingState(RecordingState.RECORDING);
    } catch (error) {
      console.error('Failed to resume recording:', error);
      setRecordingState(RecordingState.PAUSED);
    }
  };

  const onProcessRecord = async () => {
    setRecordingState(RecordingState.STOPPING);

    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setRecordingState(RecordingState.PROCESSING);
      // Animate to processing state size (50px width) with more damping
      width.value = withSpring(54, {
        damping: 25,
        stiffness: 150,
      });
      height.value = withSpring(54, {
        damping: 25,
        stiffness: 150,
      });
      // Fade out recording view and fade in processing view
      recordingViewOpacity.value = withTiming(0, { duration: 200 });
      processingViewOpacity.value = withTiming(1, { duration: 200 });

      // Call the old callback for backwards compatibility
      onRecordingComplete?.(result);

      // Start the complete processing pipeline
      console.log('🚀 Starting complete processing pipeline...');
      const processingResult = await processRecordingComplete(
        currentRecordingPath || result
      );

      // Notify parent component with transcription result
      onTranscriptionComplete?.(
        processingResult.transcript,
        processingResult.success,
        processingResult.error
      );

      console.log('✅ Processing pipeline completed:', processingResult);

      // Reset to idle state after processing completes
      setRecordingState(RecordingState.IDLE);

      // Animate back to collapsed state
      width.value = withSpring(100, {
        damping: 15,
        stiffness: 150,
      });
      height.value = withSpring(54, {
        damping: 25,
        stiffness: 150,
      });

      // Fade out processing view and fade in record view
      processingViewOpacity.value = withTiming(0, { duration: 200 });
      recordViewOpacity.value = withTiming(1, { duration: 200 });
    } catch (error) {
      console.error('Failed to stop recording:', error);

      // Reset to idle state on error
      setRecordingState(RecordingState.IDLE);

      // Animate back to collapsed state
      width.value = withSpring(100, {
        damping: 15,
        stiffness: 150,
      });
      height.value = withSpring(54, {
        damping: 25,
        stiffness: 150,
      });

      // Fade out processing view and fade in record view
      processingViewOpacity.value = withTiming(0, { duration: 200 });
      recordViewOpacity.value = withTiming(1, { duration: 200 });

      onTranscriptionComplete?.(
        '',
        false,
        `Failed to process recording: ${error}`
      );
    }
  };

  const onDeleteRecord = async () => {
    setRecordingState(RecordingState.STOPPING);

    try {
      await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setRecordingState(RecordingState.IDLE);
      // Reset metering values to empty array
      setMeteringValues([]);
      // Animate back to collapsed state
      width.value = withSpring(100, {
        damping: 15,
        stiffness: 150,
      });
      height.value = withSpring(54, {
        damping: 15,
        stiffness: 150,
      });
      // Fade out recording view and fade in record view
      recordingViewOpacity.value = withTiming(0, { duration: 200 });
      recordViewOpacity.value = withTiming(1, { duration: 200 });
      // Don't call onRecordingComplete since we're deleting
    } catch (error) {
      console.error('Failed to delete recording:', error);
      setRecordingState(RecordingState.RECORDING);
    }
  };
  const handlePressIn = () => {
    scale.value = withSpring(0.8, {
      damping: 15,
      stiffness: 150,
    });
    mainButtonOpacity.value = withTiming(0.5, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
    mainButtonOpacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (
      recordingState === RecordingState.LOADING ||
      recordingState === RecordingState.STOPPING
    ) {
      return;
    }

    switch (recordingState) {
      case RecordingState.IDLE:
        onStartRecord();
        break;
      case RecordingState.RECORDING:
        onPauseRecord();
        break;
      case RecordingState.PAUSED:
        onResumeRecord();
        break;
      case RecordingState.PROCESSING:
        // Return to idle state when tapping during processing
        setRecordingState(RecordingState.IDLE);
        setMeteringValues([]);
        // Animate back to idle size
        width.value = withSpring(100, {
          damping: 15,
          stiffness: 150,
        });
        height.value = withSpring(54, {
          damping: 15,
          stiffness: 150,
        });
        // Fade out processing view and fade in record view
        processingViewOpacity.value = withTiming(0, { duration: 200 });
        recordViewOpacity.value = withTiming(1, { duration: 200 });
        break;
    }
  };
  const containerStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
      height: height.value,
      borderRadius: height.value / 2,
    };
  });
  const renderRecordView = () => {
    return (
      <Animated.View
        style={[
          {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            width: '100%',
            height: '100%',
          },
          recordViewAnimatedStyle,
        ]}
      >
        <StaticMeter maxHeight={20} color="white" />
      </Animated.View>
    );
  };

  const renderProcessingView = () => {
    return (
      <Animated.View
        style={[
          {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            width: '100%',
            height: '100%',
          },
          processingViewAnimatedStyle,
        ]}
      >
        <ProcessingMeter maxHeight={20} color="white" />
      </Animated.View>
    );
  };

  const renderRecordingView = () => {
    const isPaused = recordingState === RecordingState.PAUSED;

    return (
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            paddingHorizontal: 16,
          },
          recordingViewAnimatedStyle,
        ]}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, marginHorizontal: 16 }}>
            <AudioMeter
              meteringValues={meteringValues}
              barCount={40}
              maxHeight={40}
              color="white"
              opacity={1}
            />
          </View>
        </View>

        {/* During recording, show all controls */}
        <>
          <Pressable
            onPress={onProcessRecord}
            onPressIn={() => {
              checkButtonOpacity.value = withTiming(0.5, { duration: 100 });
            }}
            onPressOut={() => {
              checkButtonOpacity.value = withTiming(1, { duration: 100 });
            }}
            style={{ width: 60, alignItems: 'center' }}
          >
            <Animated.View style={checkButtonAnimatedStyle}>
              <Feather name="check" size={24} color="white" />
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={onDeleteRecord}
            onPressIn={() => {
              closeButtonOpacity.value = withTiming(0.5, { duration: 100 });
            }}
            onPressOut={() => {
              closeButtonOpacity.value = withTiming(1, { duration: 100 });
            }}
            style={{ width: 60, alignItems: 'center' }}
          >
            <Animated.View style={closeButtonAnimatedStyle}>
              <AntDesign name="close" size={24} color="white" />
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={isPaused ? onResumeRecord : onPauseRecord}
            onPressIn={() => {
              pauseButtonOpacity.value = withTiming(0.5, { duration: 100 });
            }}
            onPressOut={() => {
              pauseButtonOpacity.value = withTiming(1, { duration: 100 });
            }}
            style={{ width: 60, alignItems: 'center' }}
          >
            <Animated.View style={pauseButtonAnimatedStyle}>
              {isPaused ? (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: 'white',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                />
              ) : (
                <AntDesign name={'pause'} size={24} color="white" />
              )}
            </Animated.View>
          </Pressable>
        </>
      </Animated.View>
    );
  };
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: 0,
        paddingBottom: insets.bottom + 20,
        alignItems: 'center',
      }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <Animated.View
          style={[
            {
              backgroundColor: '#00AA00',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            },
            containerStyle,
          ]}
        >
          <Animated.View
            style={[
              { position: 'absolute', width: '100%', height: '100%' },
              mainButtonAnimatedStyle,
            ]}
          >
            <View
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            >
              {renderRecordView()}
            </View>
            <View
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            >
              {renderProcessingView()}
            </View>
            <View
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            >
              {renderRecordingView()}
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
