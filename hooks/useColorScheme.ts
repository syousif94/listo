import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorSchemeStore } from '../store/colorSchemeStore';

export function useColorScheme() {
  const systemColorScheme = useRNColorScheme();
  const { colorSchemeMode } = useColorSchemeStore();

  if (colorSchemeMode === 'system') {
    return systemColorScheme ?? 'light';
  }

  return colorSchemeMode;
}
