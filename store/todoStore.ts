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

export interface AudioProcessingState {
  isProcessing: boolean;
  error?: string;
  lastTranscript?: string;
}

interface TodoStore {
  lists: TodoList[];
  whisperDownload: WhisperDownloadState;
  audioProcessing: AudioProcessingState;
  addList: (name: string) => void;
  updateList: (id: string, updates: Partial<TodoList>) => void;
  deleteList: (id: string) => void;
  addTodoToList: (listId: string, text: string, dueDate?: string) => void;
  updateTodo: (
    listId: string,
    todoId: string,
    updates: Partial<TodoItem>
  ) => void;
  toggleTodo: (listId: string, todoId: string) => void;
  deleteTodo: (listId: string, todoId: string) => void;
  getAllTodosWithDueDates: () => (TodoItem & { listName: string })[];
  updateWhisperDownload: (updates: Partial<WhisperDownloadState>) => void;
  resetWhisperDownload: () => void;
  updateAudioProcessing: (updates: Partial<AudioProcessingState>) => void;
  resetAudioProcessing: () => void;
  getCurrentListsString: () => string;
  createListWithTasks: (title: string, tasks?: { title: string }[]) => void;
  renameList: (listId: string, newTitle: string) => void;
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
      audioProcessing: {
        isProcessing: false,
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

      updateTodo: (
        listId: string,
        todoId: string,
        updates: Partial<TodoItem>
      ) =>
        set((state) => {
          const list = state.lists.find((l) => l.id === listId);
          if (list) {
            const todo = list.items.find((item) => item.id === todoId);
            if (todo) {
              Object.assign(todo, updates);
              list.updatedAt = new Date().toISOString();
            }
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

      updateAudioProcessing: (updates: Partial<AudioProcessingState>) =>
        set((state) => {
          Object.assign(state.audioProcessing, updates);
        }),

      resetAudioProcessing: () =>
        set((state) => {
          state.audioProcessing = {
            isProcessing: false,
          };
        }),

      getCurrentListsString: () => {
        const state = get();
        if (state.lists.length === 0) {
          return 'Current lists: None';
        }

        return state.lists
          .map((list) => {
            const itemsStr =
              list.items.length === 0
                ? 'No items'
                : list.items
                    .map(
                      (item) =>
                        `${item.completed ? '✓' : '○'} ${item.text}${
                          item.dueDate ? ` (due: ${item.dueDate})` : ''
                        }`
                    )
                    .join(', ');

            return `${list.name} (${list.items.length} items, color: ${list.color}): ${itemsStr}`;
          })
          .join(' | ');
      },

      createListWithTasks: (title: string, tasks?: { title: string }[]) =>
        set((state) => {
          const now = new Date().toISOString();
          const newList: TodoList = {
            id: generateId(),
            name: title,
            items: [],
            createdAt: now,
            updatedAt: now,
            color: '#E8F4FD', // Default soft blue
          };

          // Add tasks if provided
          if (tasks && tasks.length > 0) {
            newList.items = tasks.map((task) => ({
              id: generateId(),
              text: task.title,
              completed: false,
              createdAt: now,
            }));
          }

          state.lists.push(newList);
        }),

      renameList: (listId: string, newTitle: string) =>
        set((state) => {
          const list = state.lists.find((l) => l.id === listId);
          if (list) {
            list.name = newTitle;
            list.updatedAt = new Date().toISOString();
          }
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
