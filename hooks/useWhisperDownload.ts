import { useCallback, useEffect } from 'react';
import {
  downloadWhisperModels,
  initializeWhisperDownloadState,
} from '../services/whisperService';
import { useTodoStore } from '../store/todoStore';

export function useWhisperDownload() {
  const whisperDownload = useTodoStore((state) => state.whisperDownload);
  const updateWhisperDownload = useTodoStore(
    (state) => state.updateWhisperDownload
  );
  const resetWhisperDownload = useTodoStore(
    (state) => state.resetWhisperDownload
  );

  // Initialize download state on mount
  useEffect(() => {
    initializeWhisperDownloadState();
  }, []);

  const startDownload = useCallback(async () => {
    try {
      await downloadWhisperModels();
    } catch (error) {
      console.error('Failed to download Whisper models:', error);
    }
  }, []);

  const retryDownload = useCallback(async () => {
    resetWhisperDownload();
    await startDownload();
  }, [resetWhisperDownload, startDownload]);

  const isDownloadComplete = whisperDownload.isComplete;
  const isDownloading = whisperDownload.isDownloading;
  const hasError = !!whisperDownload.error;
  const overallProgress = Math.round(
    (whisperDownload.modelProgress + whisperDownload.coreMLProgress) / 2
  );

  return {
    whisperDownload,
    startDownload,
    retryDownload,
    isDownloadComplete,
    isDownloading,
    hasError,
    overallProgress,
    updateWhisperDownload,
    resetWhisperDownload,
  };
}
