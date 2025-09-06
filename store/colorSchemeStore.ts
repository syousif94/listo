import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const storage = new MMKV();

export type ColorSchemeMode = 'light' | 'dark' | 'system';
export type CardColor =
  | 'yellow'
  | 'blue'
  | 'pink'
  | 'green'
  | 'purple'
  | 'orange';
export type RecordingButtonColor =
  | 'green'
  | 'pink'
  | 'red'
  | 'purple'
  | 'blue'
  | 'orange';

export const cardColors: Record<CardColor, string> = {
  yellow: '#ffed85',
  blue: '#93c5fd',
  pink: '#f8b4d6',
  green: '#bbf7d0',
  purple: '#d8b4fe',
  orange: '#fed7aa',
};

export const recordingButtonColors: Record<RecordingButtonColor, string> = {
  green: '#00AA00',
  pink: '#ec4899',
  red: '#ef4444',
  purple: '#a855f7',
  blue: '#3b82f6',
  orange: '#f97316',
};

interface ColorSchemeStore {
  colorSchemeMode: ColorSchemeMode;
  cardColor: CardColor;
  recordingButtonColor: RecordingButtonColor;
  setColorSchemeMode: (mode: ColorSchemeMode) => void;
  setCardColor: (color: CardColor) => void;
  setRecordingButtonColor: (color: RecordingButtonColor) => void;
  getEffectiveColorScheme: () => 'light' | 'dark';
}

export const useColorSchemeStore = create<ColorSchemeStore>()(
  persist(
    immer((set, get) => ({
      colorSchemeMode: 'system',
      cardColor: 'yellow',
      recordingButtonColor: 'green',

      setColorSchemeMode: (mode: ColorSchemeMode) =>
        set((state) => {
          state.colorSchemeMode = mode;
        }),

      setCardColor: (color: CardColor) =>
        set((state) => {
          state.cardColor = color;
        }),

      setRecordingButtonColor: (color: RecordingButtonColor) =>
        set((state) => {
          state.recordingButtonColor = color;
        }),

      getEffectiveColorScheme: () => {
        const { colorSchemeMode } = get();
        if (colorSchemeMode === 'system') {
          // We can't use the hook here, so we'll handle this in the hook
          return 'light'; // fallback
        }
        return colorSchemeMode;
      },
    })),
    {
      name: 'color-scheme-storage',
      storage: {
        getItem: (name) => {
          const value = storage.getString(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          storage.set(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          storage.delete(name);
        },
      },
    }
  )
);
