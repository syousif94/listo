import mitt from 'mitt';

type Events = {
  scrollToPage: number;
  recordingStateChanged: { isRecording: boolean };
};

export const eventEmitter = mitt<Events>();
