import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export enum RecordingState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
}

interface RecordingStore {
  recordingState: RecordingState;
  isRecording: boolean;
  setRecordingState: (state: RecordingState) => void;
  setIsRecording: (isRecording: boolean) => void;
}

export const useRecordingStore = create<RecordingStore>()(
  immer((set) => ({
    recordingState: RecordingState.IDLE,
    isRecording: false,

    setRecordingState: (state: RecordingState) =>
      set((draft) => {
        draft.recordingState = state;
        draft.isRecording =
          state === RecordingState.LISTENING ||
          state === RecordingState.PROCESSING;
      }),

    setIsRecording: (isRecording: boolean) =>
      set((draft) => {
        draft.isRecording = isRecording;
      }),
  }))
);
