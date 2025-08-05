import { Platform } from 'react-native';

export default {
  useCoreMLIos: Platform.OS === 'ios',
  // For downloaded models, we don't use coreMLModelAsset since we're using filePath
  // The whisper.rn library will automatically look for Core ML models in the same directory
  useGpu: false, // Enable Metal (Will skip Core ML if enabled)
};
