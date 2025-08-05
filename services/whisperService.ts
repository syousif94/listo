import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { unzip } from 'react-native-zip-archive';
import { initWhisper } from 'whisper.rn';
import { useTodoStore } from '../store/todoStore';
import contextOpts from './whisperContextOpts';

const fileDir = `${FileSystem.documentDirectory}whisper`;

const MODEL_URLS = {
  model:
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin?download=true',
  coreML:
    'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-encoder.mlmodelc.zip?download=true',
};

const modelFilePath = `${fileDir}/ggml-small-q5_1.bin`;
const coremlModelFilePath = `${fileDir}/ggml-small-encoder.mlmodelc.zip`;

async function createWhisperDir() {
  await FileSystem.makeDirectoryAsync(fileDir, { intermediates: true });
}

async function fileExists(fileUri: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    return fileInfo.exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

function createDownloadProgress(type: 'model' | 'coreML') {
  return (downloadProgress: FileSystem.DownloadProgressData) => {
    const progress = Math.round(
      (downloadProgress.totalBytesWritten /
        downloadProgress.totalBytesExpectedToWrite) *
        100
    );

    console.log(
      `${
        type === 'model' ? 'Main Model' : 'Core ML Model'
      } download progress: ${progress}%`
    );

    const { updateWhisperDownload } = useTodoStore.getState();

    if (type === 'model') {
      updateWhisperDownload({ modelProgress: progress });
    } else {
      updateWhisperDownload({ coreMLProgress: progress });
    }
  };
}

async function downloadModel(): Promise<void> {
  if (await fileExists(modelFilePath)) {
    console.log('Model already exists');
    const { updateWhisperDownload } = useTodoStore.getState();
    updateWhisperDownload({ modelComplete: true, modelProgress: 100 });
    return;
  }

  console.log('Starting model download');

  const downloadResumable = FileSystem.createDownloadResumable(
    MODEL_URLS.model,
    modelFilePath,
    {},
    createDownloadProgress('model')
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (result) {
      console.log('Model download completed');
      const { updateWhisperDownload } = useTodoStore.getState();
      updateWhisperDownload({ modelComplete: true, modelProgress: 100 });
    }
  } catch (error) {
    console.error('Model download failed:', error);
    const { updateWhisperDownload } = useTodoStore.getState();
    updateWhisperDownload({
      error: `Model download failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      isDownloading: false,
    });
    throw error;
  }
}

async function downloadCoreMLModel(): Promise<void> {
  if (Platform.OS !== 'ios') {
    console.log('Skipping Core ML download on non-iOS platform');
    const { updateWhisperDownload } = useTodoStore.getState();
    updateWhisperDownload({ coreMLComplete: true, coreMLProgress: 100 });
    return;
  }

  if (await fileExists(coremlModelFilePath)) {
    console.log('Core ML Model already exists');
    const { updateWhisperDownload } = useTodoStore.getState();
    updateWhisperDownload({ coreMLComplete: true, coreMLProgress: 100 });
    return;
  }

  console.log('Starting Core ML Model download');

  const downloadResumable = FileSystem.createDownloadResumable(
    MODEL_URLS.coreML,
    coremlModelFilePath,
    {},
    createDownloadProgress('coreML')
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (result) {
      console.log('Core ML Model download completed');

      // Unzip the Core ML model
      await unzip(coremlModelFilePath, fileDir);
      console.log('Core ML Model unzipped successfully');

      const { updateWhisperDownload } = useTodoStore.getState();
      updateWhisperDownload({ coreMLComplete: true, coreMLProgress: 100 });
    }
  } catch (error) {
    console.error('Core ML Model download failed:', error);
    const { updateWhisperDownload } = useTodoStore.getState();
    updateWhisperDownload({
      error: `Core ML download failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      isDownloading: false,
    });
    throw error;
  }
}

export async function downloadWhisperModels(): Promise<void> {
  const { updateWhisperDownload, whisperDownload } = useTodoStore.getState();

  // Check if already complete
  if (whisperDownload.isComplete) {
    console.log('Whisper models already downloaded');
    return;
  }

  // Check if already downloading
  if (whisperDownload.isDownloading) {
    console.log('Whisper models already downloading');
    return;
  }

  try {
    await createWhisperDir();

    updateWhisperDownload({
      isDownloading: true,
      error: undefined,
      modelProgress: 0,
      coreMLProgress: 0,
    });

    // Download both models simultaneously
    const downloads = await Promise.allSettled([
      downloadModel(),
      downloadCoreMLModel(),
    ]);

    // Check if any downloads failed
    const failedDownloads = downloads.filter(
      (result) => result.status === 'rejected'
    );
    if (failedDownloads.length > 0) {
      const errors = failedDownloads.map((result) =>
        result.status === 'rejected' ? result.reason : 'Unknown error'
      );
      throw new Error(`Some downloads failed: ${errors.join(', ')}`);
    }

    // Mark as complete
    updateWhisperDownload({
      isDownloading: false,
      isComplete: true,
      error: undefined,
    });

    console.log(
      '🎉 All Whisper models downloaded successfully! Ready for speech-to-text.'
    );
  } catch (error) {
    console.error('Error downloading Whisper models:', error);
    updateWhisperDownload({
      isDownloading: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error downloading models',
    });
    throw error;
  }
}

export async function initializeWhisper() {
  try {
    // Ensure models are downloaded first
    await downloadWhisperModels();

    console.log('🚀 Initializing Whisper with downloaded models...');

    const ctx = await initWhisper({
      filePath: modelFilePath,
      ...contextOpts,
    });

    console.log(
      '✅ Whisper initialized successfully and ready for transcription!'
    );
    return ctx;
  } catch (error) {
    console.error('❌ Failed to initialize Whisper:', error);
    throw error;
  }
}

// Simple function to check and report model status
export function logWhisperStatus(): void {
  const { whisperDownload } = useTodoStore.getState();

  console.log('\n=== Whisper Status ===');
  console.log(`Downloading: ${whisperDownload.isDownloading ? 'Yes' : 'No'}`);
  console.log(`Complete: ${whisperDownload.isComplete ? 'Yes' : 'No'}`);
  console.log(
    `Main Model: ${whisperDownload.modelComplete ? '✅' : '❌'} (${
      whisperDownload.modelProgress
    }%)`
  );
  console.log(
    `Core ML: ${whisperDownload.coreMLComplete ? '✅' : '❌'} (${
      whisperDownload.coreMLProgress
    }%)`
  );
  if (whisperDownload.error) {
    console.log(`Error: ${whisperDownload.error}`);
  }
  console.log('=====================\n');
}

// Check if models are already downloaded
export async function checkModelsExist(): Promise<{
  model: boolean;
  coreML: boolean;
}> {
  const modelExists = await fileExists(modelFilePath);
  const coreMLExists =
    Platform.OS === 'ios'
      ? await fileExists(`${fileDir}/ggml-small-encoder.mlmodelc`)
      : true; // Consider complete on non-iOS

  return { model: modelExists, coreML: coreMLExists };
}

// Initialize on app startup - check existing downloads and update store
export async function initializeWhisperDownloadState(): Promise<void> {
  const { model: modelExists, coreML: coreMLExists } = await checkModelsExist();
  const { updateWhisperDownload } = useTodoStore.getState();

  const isComplete = modelExists && coreMLExists;

  console.log('Whisper Models Status:');
  console.log(
    `- Main Model: ${modelExists ? '✅ Ready' : '❌ Not downloaded'}`
  );
  console.log(
    `- Core ML Model: ${coreMLExists ? '✅ Ready' : '❌ Not downloaded'}`
  );
  console.log(
    `- Overall Status: ${
      isComplete ? '✅ All models ready' : '⏳ Downloads needed'
    }`
  );

  updateWhisperDownload({
    modelComplete: modelExists,
    coreMLComplete: coreMLExists,
    modelProgress: modelExists ? 100 : 0,
    coreMLProgress: coreMLExists ? 100 : 0,
    isComplete,
    isDownloading: false,
  });
}
