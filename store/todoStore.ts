import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { notificationService } from '../services/notificationService';

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

export interface AudioProcessingState {
  isProcessing: boolean;
  error?: string;
  lastTranscript?: string;
}

export interface ToastState {
  isVisible: boolean;
  message: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  tool_calls?: any[];
}

export interface ChatHistory {
  messages: ChatMessage[];
}

export interface TokenUsage {
  remainingTokens: number;
  totalUsed: number; // completion tokens used
  monthlyLimit: number; // completion token limit
  lastUpdated?: string;
}

interface TodoStore {
  lists: TodoList[];
  audioProcessing: AudioProcessingState;
  toast: ToastState;
  chatHistory: ChatHistory;
  tokenUsage: TokenUsage | null;
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
  updateAudioProcessing: (updates: Partial<AudioProcessingState>) => void;
  resetAudioProcessing: () => void;
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
  getCurrentListsString: () => string;
  createListWithTasks: (
    title: string,
    tasks?: { text: string; completed?: boolean; dueDate?: string }[]
  ) => void;
  createTodosInList: (
    listId: string,
    todos: { text: string; completed?: boolean; dueDate?: string }[]
  ) => void;
  renameList: (listId: string, newTitle: string) => void;
  updateTodoById: (todoId: string, updates: Partial<TodoItem>) => void;
  deleteTodoById: (todoId: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  getChatHistory: () => ChatMessage[];
  getChatHistoryForAPI: () => any[];
  clearChatHistory: () => void;
  trimChatHistory: (maxMessages?: number) => void;
  clearHistoryOnAppLaunch: () => void;
  scheduleAllNotifications: () => Promise<void>;
  initializeNotifications: () => Promise<void>;
  updateTokenUsage: (tokenUsage: TokenUsage) => void;
  getTokenUsage: () => TokenUsage | null;
  reorderLists: (listIds: string[]) => void;
  reorderTodosInList: (listId: string, todoIds: string[]) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useTodoStore = create<TodoStore>()(
  persist(
    immer((set, get) => ({
      lists: [],
      audioProcessing: {
        isProcessing: false,
      },
      toast: {
        isVisible: false,
        message: '',
      },
      chatHistory: {
        messages: [],
      },
      tokenUsage: null,

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
            const newTodo = {
              id: generateId(),
              text,
              completed: false,
              createdAt: now,
              dueDate,
            };
            list.items.push(newTodo);
            list.updatedAt = now;

            // Schedule notification if todo has due date
            if (dueDate) {
              notificationService.scheduleTodoNotification(newTodo, list.name);
            }
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
              const newTodo = { ...todo, ...updates };
              console.log('Updating todo:', newTodo);
              Object.assign(todo, newTodo);
              list.updatedAt = new Date().toISOString();

              // Handle notification updates
              notificationService.cancelTodoNotification(todoId);

              // Schedule new notifications if todo has due date and is not completed
              if (newTodo.dueDate && !newTodo.completed) {
                notificationService.scheduleTodoNotification(
                  newTodo,
                  list.name
                );
              }
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

              // Handle notifications based on completion status
              if (todo.completed) {
                // Cancel notifications when todo is completed
                notificationService.cancelTodoNotification(todoId);
              } else if (todo.dueDate) {
                // Reschedule notifications when todo is uncompleted and has due date
                notificationService.scheduleTodoNotification(todo, list.name);
              }
            }
          }
        }),

      deleteTodo: (listId: string, todoId: string) =>
        set((state) => {
          const list = state.lists.find((l) => l.id === listId);
          if (list) {
            list.items = list.items.filter((item) => item.id !== todoId);
            list.updatedAt = new Date().toISOString();

            // Cancel notifications for deleted todo
            notificationService.cancelTodoNotification(todoId);
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

      showToast: (message: string, type?: 'error' | 'success' | 'info') =>
        set((state) => {
          // Only show error toasts
          if (type !== 'error' && type !== undefined) return;

          state.toast = {
            isVisible: true,
            message,
          };
        }),

      hideToast: () =>
        set((state) => {
          state.toast = {
            ...state.toast,
            isVisible: false,
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
                        `${item.completed ? '✓' : '○'} ${item.text} (id: ${
                          item.id
                        }, created: ${item.createdAt})${
                          item.dueDate ? ` (due: ${item.dueDate})` : ''
                        }`
                    )
                    .join(', ');

            return `${list.name} (id: ${list.id}, ${list.items.length} items, color: ${list.color}, created: ${list.createdAt}, updated: ${list.updatedAt}): ${itemsStr}`;
          })
          .join(' | ');
      },

      createListWithTasks: (
        title: string,
        tasks?: { text: string; completed?: boolean; dueDate?: string }[]
      ) =>
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
              text: task.text,
              completed: task.completed || false,
              createdAt: now,
              dueDate: task.dueDate,
            }));

            // Schedule notifications for tasks with due dates
            newList.items.forEach((task) => {
              if (task.dueDate && !task.completed) {
                notificationService.scheduleTodoNotification(
                  task,
                  newList.name
                );
              }
            });
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

      createTodosInList: (
        listId: string,
        todos: { text: string; completed?: boolean; dueDate?: string }[]
      ) =>
        set((state) => {
          const list = state.lists.find((l) => l.id === listId);
          if (list) {
            const now = new Date().toISOString();
            const newTodos = todos.map((todo) => ({
              id: generateId(),
              text: todo.text,
              completed: todo.completed || false,
              createdAt: now,
              dueDate: todo.dueDate,
            }));
            list.items.push(...newTodos);
            list.updatedAt = now;

            // Schedule notifications for todos with due dates
            newTodos.forEach((todo) => {
              if (todo.dueDate && !todo.completed) {
                notificationService.scheduleTodoNotification(todo, list.name);
              }
            });
          }
        }),

      updateTodoById: (todoId: string, updates: Partial<TodoItem>) =>
        set((state) => {
          // Find todo across all lists
          for (const list of state.lists) {
            const todoIndex = list.items.findIndex(
              (item) => item.id === todoId
            );
            let todo = list.items[todoIndex];
            if (todo) {
              const newTodo = { ...todo, ...updates };
              list.items[todoIndex] = newTodo;
              console.log('Updating todo:', updates, todo);
              list.updatedAt = new Date().toISOString();

              // Handle notification updates
              notificationService.cancelTodoNotification(todoId);

              // Schedule new notifications if todo has due date and is not completed
              if (newTodo.dueDate && !newTodo.completed) {
                notificationService.scheduleTodoNotification(
                  newTodo,
                  list.name
                );
              }

              break;
            }
          }
        }),

      deleteTodoById: (todoId: string) =>
        set((state) => {
          // Find and delete todo across all lists
          for (const list of state.lists) {
            const todoIndex = list.items.findIndex(
              (item) => item.id === todoId
            );
            if (todoIndex !== -1) {
              list.items.splice(todoIndex, 1);
              list.updatedAt = new Date().toISOString();

              // Cancel notifications for deleted todo
              notificationService.cancelTodoNotification(todoId);
              break;
            }
          }
        }),

      addChatMessage: (message: ChatMessage) =>
        set((state) => {
          // Check if last message was over 10 minutes ago and clear history if so
          if (state.chatHistory.messages.length > 0) {
            const lastMessage =
              state.chatHistory.messages[state.chatHistory.messages.length - 1];
            const lastMessageTime = new Date(lastMessage.timestamp).getTime();
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - lastMessageTime;
            const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds

            if (timeDifference > tenMinutesInMs) {
              state.chatHistory.messages = [];
            }
          }

          state.chatHistory.messages.push(message);
          // Keep only last 16 messages (8 user-assistant pairs) to prevent memory issues
          if (state.chatHistory.messages.length > 16) {
            state.chatHistory.messages = state.chatHistory.messages.slice(-16);
          }
        }),

      getChatHistory: () => {
        const state = get();
        return state.chatHistory.messages;
      },

      getChatHistoryForAPI: () => {
        const state = get();
        return state.chatHistory.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
        }));
      },

      clearChatHistory: () =>
        set((state) => {
          state.chatHistory.messages = [];
        }),

      trimChatHistory: (maxMessages: number = 10) =>
        set((state) => {
          if (state.chatHistory.messages.length > maxMessages) {
            // Keep user-assistant pairs together by taking the last N messages
            state.chatHistory.messages = state.chatHistory.messages.slice(
              -maxMessages
            );
          }
        }),

      clearHistoryOnAppLaunch: () =>
        set((state) => {
          // Always clear chat history when app launches to start fresh
          state.chatHistory.messages = [];
        }),

      scheduleAllNotifications: async () => {
        const state = get();
        const todosWithDueDates = state.getAllTodosWithDueDates();
        await notificationService.scheduleAllTodoNotifications(
          todosWithDueDates
        );
      },

      initializeNotifications: async () => {
        await notificationService.requestPermissions();
        const state = get();
        const todosWithDueDates = state.getAllTodosWithDueDates();
        await notificationService.scheduleAllTodoNotifications(
          todosWithDueDates
        );
      },

      updateTokenUsage: (tokenUsage: TokenUsage) =>
        set((state) => {
          state.tokenUsage = {
            ...tokenUsage,
            lastUpdated: new Date().toISOString(),
          };
        }),

      getTokenUsage: () => {
        const state = get();
        return state.tokenUsage;
      },

      reorderLists: (listIds: string[]) =>
        set((state) => {
          // Validate input
          if (!Array.isArray(listIds) || listIds.length === 0) {
            console.warn('Invalid listIds provided for reorderLists');
            return;
          }

          // Create a map of current lists by id for quick lookup
          const listMap = new Map(state.lists.map((list) => [list.id, list]));

          // Reorder lists according to the provided array
          const reorderedLists = listIds
            .map((id) => listMap.get(id))
            .filter((list): list is TodoList => list !== undefined);

          // Only update if we have all lists accounted for
          if (
            reorderedLists.length === state.lists.length &&
            reorderedLists.length === listIds.length
          ) {
            state.lists = reorderedLists;
            // Update timestamp for all affected lists
            const now = new Date().toISOString();
            state.lists.forEach((list) => {
              list.updatedAt = now;
            });
            console.log(`✅ Reordered ${state.lists.length} lists`);
          } else {
            console.warn(
              `Cannot reorder lists: expected ${state.lists.length} lists, got ${reorderedLists.length} valid IDs`
            );
          }
        }),

      reorderTodosInList: (listId: string, todoIds: string[]) =>
        set((state) => {
          // Validate input
          if (!listId || !Array.isArray(todoIds) || todoIds.length === 0) {
            console.warn('Invalid parameters provided for reorderTodosInList');
            return;
          }

          const list = state.lists.find((l) => l.id === listId);
          if (!list) {
            console.warn(`List with id ${listId} not found`);
            return;
          }

          // Create a map of current todos by id for quick lookup
          const todoMap = new Map(list.items.map((todo) => [todo.id, todo]));

          // Reorder todos according to the provided array
          const reorderedTodos = todoIds
            .map((id) => todoMap.get(id))
            .filter((todo): todo is TodoItem => todo !== undefined);

          // Only update if we have all todos accounted for
          if (
            reorderedTodos.length === list.items.length &&
            reorderedTodos.length === todoIds.length
          ) {
            list.items = reorderedTodos;
            list.updatedAt = new Date().toISOString();
            console.log(
              `✅ Reordered ${list.items.length} todos in list ${listId}`
            );
          } else {
            console.warn(
              `Cannot reorder todos in list ${listId}: expected ${list.items.length} todos, got ${reorderedTodos.length} valid IDs`
            );
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
