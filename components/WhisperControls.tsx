import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWhisperDownload } from '../hooks/useWhisperDownload';
import { initializeWhisper } from '../services/whisperService';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { WhisperDownloadStatus } from './WhisperDownloadStatus';

export function WhisperControls() {
  const [whisperContext, setWhisperContext] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const { isDownloadComplete } = useWhisperDownload();

  const handleInitializeWhisper = async () => {
    if (!isDownloadComplete) {
      Alert.alert(
        'Download Required',
        'Please download the Whisper models first.'
      );
      return;
    }

    setIsInitializing(true);
    try {
      const ctx = await initializeWhisper();
      setWhisperContext(ctx);
      Alert.alert('Success', 'Whisper initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      Alert.alert(
        'Error',
        'Failed to initialize Whisper. Check the console for details.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Whisper Speech-to-Text</ThemedText>

      <WhisperDownloadStatus />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            (!isDownloadComplete || isInitializing) && styles.buttonDisabled,
          ]}
          onPress={handleInitializeWhisper}
          disabled={!isDownloadComplete || isInitializing}
        >
          <Text style={styles.buttonText}>
            {isInitializing ? 'Initializing...' : 'Initialize Whisper'}
          </Text>
        </TouchableOpacity>

        {whisperContext && (
          <ThemedText style={styles.statusText}>
            ✅ Whisper is ready for transcription!
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  controls: {
    gap: 12,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusText: {
    color: '#34C759',
    fontWeight: '500',
    textAlign: 'center',
  },
});
