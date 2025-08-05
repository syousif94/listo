import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTodoStore } from '../store/todoStore';

/**
 * AudioProcessingStatus component displays the current state of audio processing.
 * Shows processing indicator, errors, and last transcript.
 */
export default function AudioProcessingStatus() {
  const { audioProcessing } = useTodoStore();
  const { isProcessing, error, lastTranscript } = audioProcessing;

  // Don't render anything if not processing and no error
  if (!isProcessing && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {isProcessing && !error && (
          <View style={styles.processingRow}>
            <AntDesign name="loading1" size={16} color="#007AFF" />
            <Text style={styles.processingText}>Processing audio...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorRow}>
              <AntDesign name="exclamationcircle" size={16} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            {lastTranscript && (
              <Text style={styles.transcriptText}>
                Last transcript: {`"${lastTranscript}"`}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  errorContainer: {
    gap: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    flex: 1,
  },
  transcriptText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 24, // Align with error text
  },
});
