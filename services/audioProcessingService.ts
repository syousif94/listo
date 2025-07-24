import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native-alt';
import { initializeWhisper } from './whisperService';

export interface TranscriptionResult {
  transcript: string;
  audioPath: string;
  success: boolean;
  error?: string;
}

export async function convertAudioForWhisper(
  inputPath: string
): Promise<string | undefined> {
  const audioDir = `${FileSystem.cacheDirectory}whisper_audio`;

  // Create directory if it doesn't exist
  await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true }).catch(
    () => {
      console.log('Audio directory exists');
    }
  );

  // Generate unique filename
  const timestamp = Date.now();
  const outputPath = `${audioDir}/recording_${timestamp}.wav`;

  // Remove existing file if it exists
  await FileSystem.deleteAsync(outputPath).catch(() => {
    console.log('No existing file to delete');
  });

  console.log('🎵 Converting audio for Whisper:', inputPath, '→', outputPath);

  try {
    // Convert m4a to wav with Whisper-compatible format:
    // - Sample rate: 16kHz
    // - Channels: 1 (mono)
    // - Format: 16-bit PCM
    const session = await FFmpegKit.execute(
      `-i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`
    );

    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('✅ Audio conversion successful:', outputPath);
      return outputPath;
    } else {
      const output = await session.getOutput();
      console.error('❌ FFmpeg conversion failed:', output);
      return undefined;
    }
  } catch (error) {
    console.error('❌ Error during audio conversion:', error);
    return undefined;
  }
}

export async function transcribeAudio(
  audioPath: string
): Promise<TranscriptionResult> {
  try {
    console.log('🎤 Starting Whisper transcription for:', audioPath);

    // Initialize Whisper if not already done
    const whisperContext = await initializeWhisper();

    // Transcribe the audio
    const options = { language: 'en' };
    const { promise } = whisperContext.transcribe(audioPath, options);

    console.log('⏳ Transcribing audio...');
    const { result } = await promise;

    console.log('✅ Transcription completed:', result);

    return {
      transcript: result,
      audioPath,
      success: true,
    };
  } catch (error) {
    console.error('❌ Transcription failed:', error);
    return {
      transcript: '',
      audioPath,
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown transcription error',
    };
  }
}

export async function processRecordingToTranscript(
  recordingPath: string
): Promise<TranscriptionResult> {
  try {
    console.log('🚀 Starting full audio processing pipeline...');

    // Step 1: Convert audio to Whisper-compatible format
    console.log('📝 Step 1: Converting audio format...');
    const convertedPath = await convertAudioForWhisper(recordingPath);

    if (!convertedPath) {
      throw new Error('Failed to convert audio to Whisper format');
    }

    // Step 2: Transcribe with Whisper
    console.log('📝 Step 2: Transcribing with Whisper...');
    const transcriptionResult = await transcribeAudio(convertedPath);

    // Cleanup: Remove the converted audio file
    try {
      await FileSystem.deleteAsync(convertedPath);
      console.log('🧹 Cleaned up converted audio file');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup converted audio file:', cleanupError);
    }

    return transcriptionResult;
  } catch (error) {
    console.error('❌ Audio processing pipeline failed:', error);
    return {
      transcript: '',
      audioPath: recordingPath,
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown processing error',
    };
  }
}

// Function to post transcript to API (placeholder - replace with your actual endpoint)
export async function postTranscriptToAPI(
  transcript: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🌐 Posting transcript to API:', transcript);

    // TODO: Replace 'YOUR_API_ENDPOINT' with your actual API URL
    // Example: const response = await fetch('https://your-api.com/transcripts', {
    const API_ENDPOINT = 'YOUR_API_ENDPOINT'; // <-- CHANGE THIS

    if (API_ENDPOINT === 'YOUR_API_ENDPOINT') {
      // Skip API call if not configured
      console.log('⚠️ API endpoint not configured, skipping API call');
      return { success: true };
    }

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        timestamp: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      console.log('✅ Successfully posted transcript to API');
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('❌ API request failed:', response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }
  } catch (error) {
    console.error('❌ Failed to post to API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Main function that handles the complete flow
export async function processRecordingComplete(recordingPath: string): Promise<{
  transcript: string;
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🎯 Starting complete recording processing flow...');

    // Process audio and transcribe
    const transcriptionResult = await processRecordingToTranscript(
      recordingPath
    );

    if (!transcriptionResult.success) {
      return {
        transcript: '',
        success: false,
        error: transcriptionResult.error,
      };
    }

    // Post to API
    const apiResult = await postTranscriptToAPI(transcriptionResult.transcript);

    if (!apiResult.success) {
      console.warn('⚠️ Transcription succeeded but API posting failed');
      // Still return the transcript even if API fails
      return {
        transcript: transcriptionResult.transcript,
        success: false,
        error: `Transcription: ✅ | API: ❌ ${apiResult.error}`,
      };
    }

    console.log('🎉 Complete processing flow successful!');
    return {
      transcript: transcriptionResult.transcript,
      success: true,
    };
  } catch (error) {
    console.error('❌ Complete processing flow failed:', error);
    return {
      transcript: '',
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error in processing flow',
    };
  }
}
