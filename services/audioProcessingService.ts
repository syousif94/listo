import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native-alt';
import type { ChatCompletion } from 'groq-sdk/resources/chat/completions.mjs';
import { useTodoStore } from '../store/todoStore';
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

// Function to send transcript to chat API and process tool calls
export async function processTranscriptWithChat(
  transcript: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🌐 Sending transcript to chat API:', transcript);

    // Get current lists from store
    const currentLists = useTodoStore.getState().getCurrentListsString();

    // Prepend current lists to transcript
    const fullTranscript = `${currentLists}\n\nNew request: ${transcript}`;

    console.log('📋 Full transcript with current lists:', fullTranscript);

    // TODO: Replace with your actual backend URL
    const API_ENDPOINT = 'https://sammys-mac-mini.tail2bbcb.ts.net/chat'; // <-- CHANGE THIS to your backend URL

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: fullTranscript,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Chat API request failed:', response.status, errorText);
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
      };
    }

    const result = (await response.json()) as ChatCompletion;
    console.log('✅ Chat API response received:', result);

    // Extract tool calls from the response
    const toolCalls = result.choices?.[0]?.message?.tool_calls || [];

    if (toolCalls.length === 0) {
      console.log('⚠️ No tool calls found in response');
      return {
        success: true,
      };
    }

    console.log('🔧 Processing tool calls:', toolCalls);

    // Process each tool call
    const store = useTodoStore.getState();

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`🔧 Executing tool call: ${functionName}`, args);

        switch (functionName) {
          case 'createListWithTasks':
            // Handle both 'text' and 'title' properties for backward compatibility
            const normalizedTasks = args.tasks?.map((task: any) => ({
              text: task.text || task.title,
              completed: task.completed || false,
              dueDate: task.dueDate,
            }));
            store.createListWithTasks(args.title, normalizedTasks);
            console.log(`✅ Created list: ${args.title}`);
            break;

          case 'createTodosInList':
            store.createTodosInList(args.listId, args.todos);
            console.log(
              `✅ Added ${args.todos?.length || 0} todos to list: ${
                args.listId
              }`
            );
            break;

          case 'renameList':
            store.renameList(args.listId, args.newTitle);
            console.log(`✅ Renamed list ${args.listId} to: ${args.newTitle}`);
            break;

          case 'updateTodo':
            store.updateTodoById(args.id, {
              text: args.text,
              completed: args.completed,
              dueDate: args.dueDate,
            });
            console.log(`✅ Updated todo: ${args.id}`);
            break;

          case 'deleteTodo':
            store.deleteTodoById(args.id);
            console.log(`✅ Deleted todo: ${args.id}`);
            break;

          case 'deleteList':
            store.deleteList(args.listId);
            console.log(`✅ Deleted list: ${args.listId}`);
            break;

          default:
            console.warn(`⚠️ Unknown tool call: ${functionName}`);
        }
      } catch (toolError) {
        console.error('❌ Error processing tool call:', toolCall, toolError);
        // Continue processing other tool calls even if one fails
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('❌ Failed to process transcript with chat:', error);
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
  // Update store to show processing started
  const store = useTodoStore.getState();
  store.updateAudioProcessing({ isProcessing: true, error: undefined });

  try {
    console.log('🎯 Starting complete recording processing flow...');

    // Process audio and transcribe
    const transcriptionResult = await processRecordingToTranscript(
      recordingPath
    );

    if (!transcriptionResult.success) {
      const error = transcriptionResult.error || 'Transcription failed';
      store.updateAudioProcessing({
        isProcessing: false,
        error,
        lastTranscript: transcriptionResult.transcript,
      });
      return {
        transcript: '',
        success: false,
        error,
      };
    }

    console.log('📝 Transcription successful, sending to chat API...');
    store.updateAudioProcessing({
      lastTranscript: transcriptionResult.transcript,
    });

    // Process with chat API
    const chatResult = await processTranscriptWithChat(
      transcriptionResult.transcript
    );

    if (!chatResult.success) {
      const error = `Transcription: ✅ | Chat processing: ❌ ${chatResult.error}`;
      store.updateAudioProcessing({
        isProcessing: false,
        error,
      });
      // Still return the transcript even if chat processing fails
      return {
        transcript: transcriptionResult.transcript,
        success: false,
        error,
      };
    }

    console.log('🎉 Complete processing flow successful!');
    store.updateAudioProcessing({
      isProcessing: false,
      error: undefined,
    });

    return {
      transcript: transcriptionResult.transcript,
      success: true,
    };
  } catch (error) {
    console.error('❌ Complete processing flow failed:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error in processing flow';

    store.updateAudioProcessing({
      isProcessing: false,
      error: errorMessage,
    });

    return {
      transcript: '',
      success: false,
      error: errorMessage,
    };
  }
}
