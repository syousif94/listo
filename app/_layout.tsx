import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
// import {
//   downloadWhisperModels,
//   initializeWhisperDownloadState,
//   logWhisperStatus,
// } from '@/services/whisperService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // const [loaded] = useFonts({
  //   SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  // });

  // Initialize whisper download state and start download on app startup
  // useEffect(() => {
  //   const initializeWhisper = async () => {
  //     console.log('🚀 App starting - checking Whisper models...');

  //     // Check current status
  //     await initializeWhisperDownloadState();
  //     logWhisperStatus();

  //     // Automatically start download if not complete
  //     try {
  //       await downloadWhisperModels();
  //     } catch (error) {
  //       console.log(
  //         '⚠️ Whisper models download will be available manually:',
  //         error
  //       );
  //     }
  //   };

  //   initializeWhisper();
  // }, []);

  // if (!loaded) {
  //   // Async font loading only occurs in development.
  //   return null;
  // }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
