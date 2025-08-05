import { AntDesign, Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  speechRecognitionService,
  type SpeechRecognitionResult,
  type SpeechRecognitionState,
} from '../services/speechRecognitionService';
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
  LISTENING = 'listening',
  PROCESSING = 'processing',
}

interface RecordingButtonProps {
  onTranscriptionComplete?: (
    transcript: string,
    success: boolean,
    error?: string
  ) => void;
  onVolumeUpdate?: (volume: number) => void;
  onProcessingComplete?: () => void;
  processingComplete?: boolean; // External trigger to complete processing
}

export default function RecordingButton({
  onTranscriptionComplete,
  onVolumeUpdate,
  onProcessingComplete,
  processingComplete,
}: RecordingButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>(
    RecordingState.IDLE
  );
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [_currentTranscript, setCurrentTranscript] = useState<string>('');
  // Add sliding window for volume samples (like the original implementation)
  const [volumeSamples, setVolumeSamples] = useState<number[]>(
    new Array(40).fill(-25)
  );

  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const scale = useSharedValue(1);
  const width = useSharedValue(100);
  const height = useSharedValue(54);

  // Opacity values for fade animations
  const recordViewOpacity = useSharedValue(1);
  const processingViewOpacity = useSharedValue(0);
  const listeningViewOpacity = useSharedValue(0);

  // Opacity values for pressable fade animations
  const checkButtonOpacity = useSharedValue(1);
  const closeButtonOpacity = useSharedValue(1);
  const mainButtonOpacity = useSharedValue(1);

  // Animated styles for fade transitions
  const recordViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: recordViewOpacity.value,
  }));

  const processingViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: processingViewOpacity.value,
  }));

  const listeningViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listeningViewOpacity.value,
  }));

  // Animated styles for pressable fade animations
  const checkButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkButtonOpacity.value,
  }));

  const closeButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: closeButtonOpacity.value,
  }));

  const mainButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mainButtonOpacity.value,
  }));

  const handleProcessingComplete = useCallback(() => {
    setRecordingState(RecordingState.IDLE);
    setVolumeLevel(0);
    setVolumeSamples(new Array(40).fill(-25)); // Reset volume samples
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

  // Set up speech recognition callbacks
  useEffect(() => {
    speechRecognitionService.setCallbacks({
      onStateChange: (state: SpeechRecognitionState) => {
        console.log('🎤 Speech recognition state changed:', state);

        if (state.isListening) {
          setRecordingState(RecordingState.LISTENING);
        } else if (state.isProcessing) {
          setRecordingState(RecordingState.PROCESSING);
          // Animate to processing state
          width.value = withSpring(54, {
            damping: 25,
            stiffness: 150,
          });
          height.value = withSpring(54, {
            damping: 25,
            stiffness: 150,
          });
          // Fade out listening view and fade in processing view
          listeningViewOpacity.value = withTiming(0, { duration: 200 });
          processingViewOpacity.value = withTiming(1, { duration: 200 });
        } else {
          setRecordingState(RecordingState.IDLE);
        }

        setCurrentTranscript(state.currentTranscript);
      },
      onVolumeChange: (volume: number) => {
        setVolumeLevel(volume);

        // Convert normalized volume (0-1) to dB scale for AudioMeter
        // AudioMeter expects dB values roughly from -25 to 0 (or -160 to 0)
        // Map 0-1 volume to -25 to 0 dB range for better visualization
        const dbValue = volume * 25 - 25; // Convert 0-1 to -25 to 0 dB

        // Update sliding window of volume samples (slide down, add new sample at end)
        setVolumeSamples((prevSamples) => {
          const newSamples = [...prevSamples.slice(1), dbValue];
          return newSamples;
        });

        onVolumeUpdate?.(volume);
      },
      onTranscriptChange: (transcript: string, isFinal: boolean) => {
        setCurrentTranscript(transcript);
        console.log('🎤 Transcript update:', transcript, 'final:', isFinal);
      },
      onComplete: (result: SpeechRecognitionResult) => {
        // Always reset to idle state when processing is complete
        // regardless of success or failure
        setRecordingState(RecordingState.IDLE);
        setVolumeLevel(0);
        setVolumeSamples(new Array(40).fill(-25));
        setCurrentTranscript('');

        // Animate back to collapsed state
        width.value = withSpring(100, {
          damping: 15,
          stiffness: 150,
        });
        height.value = withSpring(54, {
          damping: 15,
          stiffness: 150,
        });

        // Reset view opacities
        mainButtonOpacity.value = withTiming(1, { duration: 200 });
        recordViewOpacity.value = withTiming(1, { duration: 200 });
        listeningViewOpacity.value = withTiming(0, { duration: 200 });
        processingViewOpacity.value = withTiming(0, { duration: 200 });

        onTranscriptionComplete?.(
          result.transcript,
          result.success,
          result.error
        );
      },
    });

    return () => {
      // Cleanup on unmount
      speechRecognitionService.dispose();
    };
  }, [
    onTranscriptionComplete,
    onVolumeUpdate,
    width,
    height,
    mainButtonOpacity,
    recordViewOpacity,
    listeningViewOpacity,
    processingViewOpacity,
  ]);

  const onStartListening = async () => {
    setVolumeLevel(0);
    setVolumeSamples(new Array(40).fill(-25)); // Reset volume samples
    setCurrentTranscript('');

    // Immediately switch to listening state and show listening view
    setRecordingState(RecordingState.LISTENING);
    // Animate to expanded state with fade transitions
    width.value = withSpring(window.width - 64, {
      damping: 15,
      stiffness: 150,
    });
    height.value = withSpring(80, {
      damping: 15,
      stiffness: 150,
    });
    // Fade out record view and fade in listening view
    recordViewOpacity.value = withTiming(0, { duration: 200 });
    listeningViewOpacity.value = withTiming(1, { duration: 200 });

    try {
      await speechRecognitionService.startListening({
        continuous: true,
        interimResults: true,
        language: 'en-US',
      });
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      // Revert to idle state if recognition fails
      setRecordingState(RecordingState.IDLE);
      width.value = withSpring(100, {
        damping: 15,
        stiffness: 150,
      });
      height.value = withSpring(54, {
        damping: 15,
        stiffness: 150,
      });
      listeningViewOpacity.value = withTiming(0, { duration: 200 });
      recordViewOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  const onStopListening = async () => {
    try {
      await speechRecognitionService.stopListening();
      // State transitions will be handled by the speech recognition callbacks
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  };

  const onCancelListening = async () => {
    try {
      await speechRecognitionService.abortListening();
      setRecordingState(RecordingState.IDLE);
      setVolumeLevel(0);
      setVolumeSamples(new Array(40).fill(-25)); // Reset volume samples
      setCurrentTranscript('');

      // Animate back to collapsed state
      width.value = withSpring(100, {
        damping: 15,
        stiffness: 150,
      });
      height.value = withSpring(54, {
        damping: 15,
        stiffness: 150,
      });
      // Fade out listening view and fade in record view
      listeningViewOpacity.value = withTiming(0, { duration: 200 });
      recordViewOpacity.value = withTiming(1, { duration: 200 });
    } catch (error) {
      console.error('Failed to cancel speech recognition:', error);
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
    switch (recordingState) {
      case RecordingState.IDLE:
        onStartListening();
        break;
      case RecordingState.LISTENING:
        onStopListening();
        break;
      case RecordingState.PROCESSING:
        // No action during processing
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

  const renderListeningView = () => {
    // Use the actual sliding window of volume samples instead of generating fake ones
    const volumeValues = [...volumeSamples]; // Use the real volume samples from the sliding window

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
          listeningViewAnimatedStyle,
        ]}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, marginHorizontal: 16 }}>
            <AudioMeter
              meteringValues={volumeValues}
              barCount={40}
              maxHeight={40}
              color="white"
              opacity={1}
            />
          </View>

          {/* During listening, show all controls */}
          <>
            <Pressable
              onPress={onStopListening}
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
              onPress={onCancelListening}
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
              onPress={onStopListening}
              onPressIn={() => {
                checkButtonOpacity.value = withTiming(0.5, { duration: 100 });
              }}
              onPressOut={() => {
                checkButtonOpacity.value = withTiming(1, { duration: 100 });
              }}
              style={{ width: 60, alignItems: 'center' }}
            >
              <Animated.View style={checkButtonAnimatedStyle}>
                <AntDesign name={'pause'} size={24} color="white" />
              </Animated.View>
            </Pressable>
          </>
        </View>
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
              {renderListeningView()}
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
