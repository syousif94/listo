import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useTodoStore } from '../store/todoStore';
import { processTranscriptWithChat } from './audioProcessingService';

export interface SpeechRecognitionState {
  isListening: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  finalTranscript: string;
  volumeLevel: number;
  error?: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  success: boolean;
  error?: string;
}

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;
  private listeners: Map<string, any> = new Map();
  private state: SpeechRecognitionState = {
    isListening: false,
    isProcessing: false,
    currentTranscript: '',
    finalTranscript: '',
    volumeLevel: 0,
  };
  private callbacks: {
    onStateChange?: (state: SpeechRecognitionState) => void;
    onVolumeChange?: (volume: number) => void;
    onTranscriptChange?: (transcript: string, isFinal: boolean) => void;
    onComplete?: (result: SpeechRecognitionResult) => void;
  } = {};

  // Track min/max volume levels for dynamic normalization
  private minVolumeLevel: number = Number.MAX_VALUE;
  private maxVolumeLevel: number = Number.MIN_VALUE;

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService();
    }
    return SpeechRecognitionService.instance;
  }

  private setupEventListeners() {
    // Start listener
    const startListener = ExpoSpeechRecognitionModule.addListener(
      'start',
      () => {
        console.log('🎤 Speech recognition started');
        // Reset volume tracking for new session
        this.minVolumeLevel = Number.MAX_VALUE;
        this.maxVolumeLevel = Number.MIN_VALUE;
        this.updateState({
          isListening: true,
          error: undefined,
          currentTranscript: '',
          finalTranscript: '',
        });
      }
    );
    this.listeners.set('start', startListener);

    // End listener
    const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('🎤 Speech recognition ended');
      this.updateState({
        isListening: false,
        volumeLevel: 0,
      });
    });
    this.listeners.set('end', endListener);

    // Result listener
    const resultListener = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event) => {
        console.log('🎤 Results:', event.results, 'final:', event.isFinal);

        if (event.results && event.results.length > 0) {
          const latestResult = event.results[event.results.length - 1];
          const transcript = latestResult.transcript || '';

          if (event.isFinal) {
            this.updateState({
              finalTranscript: transcript,
              currentTranscript: '',
            });
            this.callbacks.onTranscriptChange?.(transcript, true);
            this.handleFinalTranscript(transcript);
          } else {
            this.updateState({
              currentTranscript: transcript,
            });
            this.callbacks.onTranscriptChange?.(transcript, false);
          }
        }
      }
    );
    this.listeners.set('result', resultListener);

    // Error listener
    const errorListener = ExpoSpeechRecognitionModule.addListener(
      'error',
      (event) => {
        console.error(
          '🎤 Speech recognition error:',
          event.error,
          event.message
        );
        const errorMessage = `${event.error}: ${event.message}`;

        this.updateState({
          isListening: false,
          isProcessing: false,
          error: errorMessage,
          volumeLevel: 0,
        });

        // Notify the UI that processing failed
        this.callbacks.onComplete?.({
          transcript: '',
          success: false,
          error: errorMessage,
        });
      }
    );
    this.listeners.set('error', errorListener);

    // Volume change listener
    const volumeChangeListener = ExpoSpeechRecognitionModule.addListener(
      'volumechange',
      (event) => {
        const rawVolume = event.value || 0;
        console.log('🎤 Volume change event:', rawVolume);

        // Update min/max tracking
        this.minVolumeLevel = Math.min(this.minVolumeLevel, rawVolume);
        this.maxVolumeLevel = Math.max(this.maxVolumeLevel, rawVolume);

        // Normalize using dynamic min/max range
        let normalizedVolume = 0;
        if (this.maxVolumeLevel > this.minVolumeLevel) {
          normalizedVolume =
            (rawVolume - this.minVolumeLevel) /
            (this.maxVolumeLevel - this.minVolumeLevel);
        }
        normalizedVolume = Math.max(0, Math.min(1, normalizedVolume));

        console.log(
          '🎤 Volume normalized:',
          normalizedVolume,
          'range:',
          this.minVolumeLevel,
          '-',
          this.maxVolumeLevel
        );

        this.updateState({
          volumeLevel: normalizedVolume,
        });
        this.callbacks.onVolumeChange?.(normalizedVolume);
      }
    );
    this.listeners.set('volumechange', volumeChangeListener);
  }

  private updateState(updates: Partial<SpeechRecognitionState>) {
    this.state = { ...this.state, ...updates };
    this.callbacks.onStateChange?.(this.state);
  }

  private async handleFinalTranscript(transcript: string) {
    if (!transcript.trim()) {
      this.updateState({ isProcessing: false });
      this.callbacks.onComplete?.({
        transcript: '',
        success: false,
        error: 'No transcript received',
      });
      return;
    }

    this.updateState({ isProcessing: true });

    try {
      console.log('🌐 Processing transcript with chat API:', transcript);

      // Update store to show processing started
      const store = useTodoStore.getState();
      store.updateAudioProcessing({
        isProcessing: true,
        error: undefined,
        lastTranscript: transcript,
      });

      // Process with chat API
      const chatResult = await processTranscriptWithChat(transcript);

      // Update store
      store.updateAudioProcessing({
        isProcessing: false,
        error: chatResult.success ? undefined : chatResult.error,
      });

      this.updateState({ isProcessing: false });

      this.callbacks.onComplete?.({
        transcript,
        success: chatResult.success,
        error: chatResult.error,
      });
    } catch (error) {
      console.error('❌ Failed to process transcript:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      const store = useTodoStore.getState();
      store.updateAudioProcessing({
        isProcessing: false,
        error: errorMessage,
      });

      this.updateState({ isProcessing: false });

      this.callbacks.onComplete?.({
        transcript,
        success: false,
        error: errorMessage,
      });
    }
  }

  setCallbacks(callbacks: {
    onStateChange?: (state: SpeechRecognitionState) => void;
    onVolumeChange?: (volume: number) => void;
    onTranscriptChange?: (transcript: string, isFinal: boolean) => void;
    onComplete?: (result: SpeechRecognitionResult) => void;
  }) {
    this.callbacks = callbacks;
  }

  async startListening(options?: {
    continuous?: boolean;
    interimResults?: boolean;
    language?: string;
  }) {
    if (this.state.isListening) {
      console.warn('Speech recognition is already running');
      return;
    }

    try {
      // Get current list names from the store
      const store = useTodoStore.getState();
      const contextualStrings = store.lists.map((list) => list.name);

      await ExpoSpeechRecognitionModule.start({
        lang: options?.language || 'en-US',
        interimResults: options?.interimResults ?? true,
        maxAlternatives: 1,
        continuous: options?.continuous ?? true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        contextualStrings,
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 100, // Update volume every 100ms for smooth animation
        },
        iosVoiceProcessingEnabled: true,
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'default',
        },
      });
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.updateState({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start speech recognition',
      });
    }
  }

  async stopListening() {
    if (!this.state.isListening) {
      console.warn('Speech recognition is not running');
      return;
    }

    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      this.updateState({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to stop speech recognition',
      });
    }
  }

  async abortListening() {
    if (!this.state.isListening) {
      console.warn('Speech recognition is not running');
      return;
    }

    try {
      await ExpoSpeechRecognitionModule.abort();
      this.updateState({
        isListening: false,
        isProcessing: false,
        currentTranscript: '',
        volumeLevel: 0,
      });
    } catch (error) {
      console.error('Failed to abort speech recognition:', error);
      this.updateState({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to abort speech recognition',
      });
    }
  }

  getState(): SpeechRecognitionState {
    return { ...this.state };
  }

  isListening(): boolean {
    return this.state.isListening;
  }

  isProcessing(): boolean {
    return this.state.isProcessing;
  }

  getCurrentTranscript(): string {
    return this.state.currentTranscript;
  }

  getFinalTranscript(): string {
    return this.state.finalTranscript;
  }

  getVolumeLevel(): number {
    return this.state.volumeLevel;
  }

  dispose() {
    // Remove all event listeners
    this.listeners.forEach((listener) => {
      listener.remove();
    });
    this.listeners.clear();

    // Abort any ongoing recognition
    if (this.state.isListening) {
      this.abortListening();
    }
  }
}

// Export singleton instance
export const speechRecognitionService = SpeechRecognitionService.getInstance();
