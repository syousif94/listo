import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface DatePickerTarget {
  type: 'todo' | 'newTodo';
  id?: string;
  listId: string;
}

interface DatePickerState {
  isVisible: boolean;
  initialDate: Date;
  target: DatePickerTarget | null;
  onNewTodoDate?: (listId: string, date: string) => void;

  // Temporary picker values (live state while picking)
  tempSelectedDate: Date;
  tempSelectedHour: number;
  tempSelectedMinute: number;
  tempSelectedAmPm: number; // 0 for AM, 1 for PM
  tempSelectedYear: number;

  // Actions
  showDatePicker: (target: DatePickerTarget, currentDate?: string) => void;
  hideDatePicker: () => void;
  setToday: () => void;
  updateTempValues: (values: {
    date?: Date;
    hour?: number;
    minute?: number;
    ampm?: number;
    year?: number;
  }) => void;
  setNewTodoDateCallback: (
    callback: (listId: string, date: string) => void
  ) => void;
  clearNewTodoDateCallback: () => void;
}

export const useDatePickerStore = create<DatePickerState>()(
  immer((set) => ({
    isVisible: false,
    initialDate: new Date(),
    target: null,
    onNewTodoDate: undefined,

    // Initialize temp values with current date
    tempSelectedDate: new Date(),
    tempSelectedHour: new Date().getHours() % 12 || 12,
    tempSelectedMinute: new Date().getMinutes(),
    tempSelectedAmPm: new Date().getHours() >= 12 ? 1 : 0,
    tempSelectedYear: new Date().getFullYear(),

    showDatePicker: (target, currentDate) =>
      set((state) => {
        state.isVisible = true;
        state.target = target;
        const date = currentDate ? new Date(currentDate) : new Date();
        state.initialDate = date;

        // Set temp values to the initial date
        state.tempSelectedDate = date;
        state.tempSelectedHour = date.getHours() % 12 || 12;
        state.tempSelectedMinute = date.getMinutes();
        state.tempSelectedAmPm = date.getHours() >= 12 ? 1 : 0;
        state.tempSelectedYear = date.getFullYear();
      }),

    hideDatePicker: () =>
      set((state) => {
        state.isVisible = false;
        state.target = null;
      }),

    setToday: () =>
      set((state) => {
        const today = new Date();
        state.initialDate = today;
        state.tempSelectedDate = today;
        state.tempSelectedHour = today.getHours() % 12 || 12;
        state.tempSelectedMinute = today.getMinutes();
        state.tempSelectedAmPm = today.getHours() >= 12 ? 1 : 0;
        state.tempSelectedYear = today.getFullYear();
      }),

    updateTempValues: (values) =>
      set((state) => {
        if (values.date !== undefined) state.tempSelectedDate = values.date;
        if (values.hour !== undefined) state.tempSelectedHour = values.hour;
        if (values.minute !== undefined)
          state.tempSelectedMinute = values.minute;
        if (values.ampm !== undefined) state.tempSelectedAmPm = values.ampm;
        if (values.year !== undefined) state.tempSelectedYear = values.year;
      }),

    setNewTodoDateCallback: (callback) =>
      set((state) => {
        state.onNewTodoDate = callback;
      }),

    clearNewTodoDateCallback: () =>
      set((state) => {
        state.onNewTodoDate = undefined;
      }),
  }))
);
