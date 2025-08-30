import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const TOKEN_KEY = 'user_token';
const USER_NAME_KEY = 'user_name';
const APPLE_USER_ID_KEY = 'apple_user_id';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: User, token: string, appleUserId?: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  checkAppleCredentialState: () => Promise<void>;
  getStoredName: () => Promise<string | null>;
  storeUserName: (name: string) => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthStore>()(
  immer((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isInitialized: false,

    setUser: async (user: User, token: string, appleUserId?: string) => {
      // Store token securely
      await SecureStore.setItemAsync(TOKEN_KEY, token);

      // Store Apple user ID if provided (for credential state checking)
      if (appleUserId) {
        await SecureStore.setItemAsync(APPLE_USER_ID_KEY, appleUserId);
      }

      set((state) => {
        state.user = user;
        state.token = token;
        state.isAuthenticated = true;
      });
    },

    logout: async () => {
      // Remove token, name, and Apple user ID from secure storage
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_NAME_KEY);
      await SecureStore.deleteItemAsync(APPLE_USER_ID_KEY);

      set((state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
    },

    initializeAuth: async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (storedToken) {
          // Validate token with backend
          try {
            const { API_ENDPOINTS } = await import('../constants/config');
            const response = await fetch(API_ENDPOINTS.user.profile, {
              headers: {
                Authorization: `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const user = await response.json();
              set((state) => {
                state.user = user;
                state.token = storedToken;
                state.isAuthenticated = true;
                state.isInitialized = true;
              });
            } else {
              // Token is invalid, remove it
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              set((state) => {
                state.isInitialized = true;
              });
            }
          } catch (error) {
            // Network error, assume token is still valid for offline use
            console.error('Error validating token:', error);
            set((state) => {
              state.token = storedToken;
              state.isAuthenticated = true;
              state.isInitialized = true;
            });
          }
        } else {
          set((state) => {
            state.isInitialized = true;
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        set((state) => {
          state.isInitialized = true;
        });
      }
    },

    checkAppleCredentialState: async () => {
      const { user, isAuthenticated } = get();

      // Only check if user is authenticated and we have a user ID
      if (!isAuthenticated || !user?.id) {
        return;
      }

      try {
        // Get the stored Apple user ID
        const appleUserId = await SecureStore.getItemAsync(APPLE_USER_ID_KEY);

        if (!appleUserId) {
          console.warn('No Apple user ID stored, skipping credential check');
          return;
        }

        const credentialState =
          await AppleAuthentication.getCredentialStateAsync(appleUserId);
        console.log('Apple credential state:', credentialState);

        // If credentials are revoked, log out the user
        if (
          credentialState ===
          AppleAuthentication.AppleAuthenticationCredentialState.REVOKED
        ) {
          console.log('Apple credentials revoked, logging out user');
          await get().logout();
        }
      } catch (error) {
        console.error('Error checking Apple credential state:', error);
        // Don't log out on error, as this could be a network issue or device limitation
      }
    },

    getStoredName: async () => {
      try {
        return await SecureStore.getItemAsync(USER_NAME_KEY);
      } catch (error) {
        console.error('Error getting stored name:', error);
        return null;
      }
    },

    storeUserName: async (name: string) => {
      try {
        await SecureStore.setItemAsync(USER_NAME_KEY, name);
      } catch (error) {
        console.error('Error storing user name:', error);
      }
    },

    getAuthHeaders: () => {
      const { token } = get();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return headers;
    },
  }))
);
