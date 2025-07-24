import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import RecordingButton from './RecordingButton';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export function TranscriptionDemo() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleRecordingComplete = (audioPath: string) => {
    console.log('📁 Recording saved to:', audioPath);
    setIsProcessing(true);
    setProcessingStatus('🎵 Converting audio format...');
  };

  const handleTranscriptionComplete = (
    transcript: string,
    success: boolean,
    error?: string
  ) => {
    setIsProcessing(false);

    if (success) {
      setLastTranscript(transcript);
      setProcessingStatus('✅ Transcription completed successfully!');
      console.log('🎉 Final transcript:', transcript);

      // You could add the transcript to a todo list here
      // For example: addTodoToList(selectedListId, transcript);
    } else {
      setProcessingStatus(`❌ Processing failed: ${error}`);
      console.error('💥 Transcription failed:', error);
      Alert.alert('Transcription Failed', error || 'Unknown error occurred');
    }
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setProcessingStatus('');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Speech-to-Text Demo</ThemedText>

      {processingStatus ? (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{processingStatus}</Text>
        </View>
      ) : null}

      {lastTranscript ? (
        <View style={styles.transcriptContainer}>
          <ThemedText style={styles.transcriptLabel}>
            Last Transcript:
          </ThemedText>
          <Text style={styles.transcriptText}>
            &ldquo;{lastTranscript}&rdquo;
          </Text>
        </View>
      ) : null}

      <RecordingButton
        onRecordingComplete={handleRecordingComplete}
        onTranscriptionComplete={handleTranscriptionComplete}
        onProcessingComplete={handleProcessingComplete}
        processingComplete={!isProcessing}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  statusContainer: {
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  transcriptContainer: {
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    fontStyle: 'italic',
  },
});
