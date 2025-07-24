import {
  downloadWhisperModels,
  initializeWhisper,
  logWhisperStatus,
} from '../services/whisperService';

// Simple example of how to use the whisper functionality

export class WhisperManager {
  private static whisperContext: any = null;

  // Initialize whisper and log status
  static async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Starting Whisper initialization...');
      this.whisperContext = await initializeWhisper();
      logWhisperStatus();
      return true;
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      return false;
    }
  }

  // Check if whisper is ready
  static isReady(): boolean {
    return this.whisperContext !== null;
  }

  // Get the whisper context for transcription
  static getContext() {
    if (!this.whisperContext) {
      throw new Error('Whisper not initialized. Call initialize() first.');
    }
    return this.whisperContext;
  }

  // Manual download trigger
  static async downloadModels(): Promise<void> {
    console.log('📥 Manually triggering model downloads...');
    await downloadWhisperModels();
    logWhisperStatus();
  }

  // Log current status
  static logStatus(): void {
    logWhisperStatus();
  }
}

// Auto-initialize on import (optional)
// WhisperManager.initialize().catch(console.error);
