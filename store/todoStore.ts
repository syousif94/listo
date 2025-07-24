import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const storage = new MMKV();

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  dueDate?: string;
}

export interface TodoList {
  id: string;
  name: string;
  items: TodoItem[];
  createdAt: string;
  updatedAt: string;
  color: string;
}

export interface WhisperDownloadState {
  isDownloading: boolean;
  isComplete: boolean;
  error?: string;
  modelProgress: number; // 0-100
  coreMLProgress: number; // 0-100
  modelComplete: boolean;
  coreMLComplete: boolean;
}

interface TodoStore {
  lists: TodoList[];
  whisperDownload: WhisperDownloadState;
  addList: (name: string) => void;
  updateList: (id: string, updates: Partial<TodoList>) => void;
  deleteList: (id: string) => void;
  addTodoToList: (listId: string, text: string, dueDate?: string) => void;
  toggleTodo: (listId: string, todoId: string) => void;
  deleteTodo: (listId: string, todoId: string) => void;
  getAllTodosWithDueDates: () => (TodoItem & { listName: string })[];
  updateWhisperDownload: (updates: Partial<WhisperDownloadState>) => void;
  resetWhisperDownload: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useTodoStore = create<TodoStore>()(
  persist(
    immer((set, get) => ({
      lists: [],
      whisperDownload: {
        isDownloading: false,
        isComplete: false,
        modelProgress: 0,
        coreMLProgress: 0,
        modelComplete: false,
        coreMLComplete: false,
      },

      addList: (name: string) =>
        set((state) => {
          const now = new Date().toISOString();
          state.lists.push({
            id: generateId(),
            name,
            items: [],
            createdAt: now,
            updatedAt: now,
            color: '#E8F4FD', // Default soft blue
          });
        }),

      updateList: (id: string, updates: Partial<TodoList>) =>
        set((state) => {
          const listIndex = state.lists.findIndex((list) => list.id === id);
          if (listIndex !== -1) {
            Object.assign(state.lists[listIndex], updates);
            state.lists[listIndex].updatedAt = new Date().toISOString();
          }
        }),

      deleteList: (id: string) =>
        set((state) => {
          state.lists = state.lists.filter((list) => list.id !== id);
        }),

      addTodoToList: (listId: string, text: string, dueDate?: string) =>
        set((state) => {
          const list = state.lists.find((l) => l.id === listId);
          if (list) {
            const now = new Date().toISOString();
            list.items.push({
              id: generateId(),
              text,
              completed: false,
              createdAt: now,
              dueDate,
            });
            list.updatedAt = now;
          }
        }),

      toggleTodo: (listId: string, todoId: string) =>
        set((state) => {
          const list = state.lists.find((l) => l.id === listId);
          if (list) {
            const todo = list.items.find((item) => item.id === todoId);
            if (todo) {
              todo.completed = !todo.completed;
              list.updatedAt = new Date().toISOString();
            }
          }
        }),

      deleteTodo: (listId: string, todoId: string) =>
        set((state) => {
          const list = state.lists.find((l) => l.id === listId);
          if (list) {
            list.items = list.items.filter((item) => item.id !== todoId);
            list.updatedAt = new Date().toISOString();
          }
        }),

      getAllTodosWithDueDates: () => {
        const state = get();
        const todosWithDueDates: (TodoItem & { listName: string })[] = [];

        state.lists.forEach((list) => {
          list.items.forEach((item) => {
            if (item.dueDate) {
              todosWithDueDates.push({
                ...item,
                listName: list.name,
              });
            }
          });
        });

        return todosWithDueDates.sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
        );
      },

      updateWhisperDownload: (updates: Partial<WhisperDownloadState>) =>
        set((state) => {
          Object.assign(state.whisperDownload, updates);
        }),

      resetWhisperDownload: () =>
        set((state) => {
          state.whisperDownload = {
            isDownloading: false,
            isComplete: false,
            modelProgress: 0,
            coreMLProgress: 0,
            modelComplete: false,
            coreMLComplete: false,
          };
        }),
    })),
    {
      name: 'todo-storage',
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
