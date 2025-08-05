import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWhisperDownload } from '../hooks/useWhisperDownload';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export function WhisperDownloadStatus() {
  const {
    whisperDownload,
    startDownload,
    retryDownload,
    isDownloadComplete,
    isDownloading,
    hasError,
    overallProgress,
  } = useWhisperDownload();

  if (isDownloadComplete) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.successText}>
          ✅ Whisper models ready
        </ThemedText>
      </ThemedView>
    );
  }

  if (hasError) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>❌ Download failed</ThemedText>
        <ThemedText style={styles.errorDetail}>
          {whisperDownload.error}
        </ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={retryDownload}>
          <Text style={styles.retryButtonText}>Retry Download</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (isDownloading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.downloadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.downloadingText}>
            Downloading Whisper models... {overallProgress}%
          </ThemedText>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressItem}>
            <ThemedText style={styles.progressLabel}>
              Main Model: {whisperDownload.modelProgress}%
            </ThemedText>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${whisperDownload.modelProgress}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.progressItem}>
            <ThemedText style={styles.progressLabel}>
              Core ML: {whisperDownload.coreMLProgress}%
            </ThemedText>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${whisperDownload.coreMLProgress}%` },
                ]}
              />
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.notDownloadedText}>
        Whisper models not downloaded
      </ThemedText>
      <TouchableOpacity style={styles.downloadButton} onPress={startDownload}>
        <Text style={styles.downloadButtonText}>Download Models</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  successText: {
    color: '#34C759',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  errorDetail: {
    color: '#FF3B30',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  downloadingText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  notDownloadedText: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#8E8E93',
  },
  progressContainer: {
    gap: 12,
  },
  progressItem: {
    gap: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  downloadButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
