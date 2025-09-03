import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_ENDPOINTS } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import { TodoItem } from '../store/todoStore';

// Configure how notifications should be handled when the app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private notificationIds: Map<string, string> = new Map();
  private hasRequestedPermissions: boolean = false;
  private pushToken: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Get the project ID from Constants
   */
  private getProjectId(): string {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      throw new Error('Project ID not found');
    }
    return projectId;
  }

  /**
   * Get push token without requesting permissions
   */
  async getPushToken(): Promise<string | null> {
    if (this.pushToken) {
      return this.pushToken;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: this.getProjectId(),
      });
      this.pushToken = pushTokenData.data;
      return this.pushToken;
    } catch (error) {
      console.log('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Request notification permissions and get push token
   */
  async requestPermissionsAndGetToken(): Promise<{
    success: boolean;
    pushToken?: string;
  }> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return { success: false };
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return { success: false };
    }

    this.hasRequestedPermissions = true;

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Get push token (will use cached one if available)
    const pushToken = await this.getPushToken();

    if (pushToken) {
      // Sync with backend
      await this.syncDeviceToken(pushToken);
      return { success: true, pushToken };
    } else {
      return { success: false };
    }
  }

  /**
   * Sync device token with backend
   */
  private async syncDeviceToken(pushToken: string): Promise<void> {
    try {
      const authStore = useAuthStore.getState();
      const headers = authStore.getAuthHeaders();

      if (!authStore.isAuthenticated) {
        console.log('User not authenticated, skipping device token sync');
        return;
      }

      const deviceName = (await Device.deviceName) || `${Platform.OS} Device`;

      const response = await fetch(API_ENDPOINTS.user.deviceToken, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pushToken,
          deviceName,
          platform: Platform.OS,
        }),
      });

      if (response.ok) {
        console.log('Device token synced successfully');
      } else {
        console.log('Failed to sync device token:', await response.text());
      }
    } catch (error) {
      console.log('Error syncing device token:', error);
    }
  }

  /**
   * Check if we have an existing push token and sync it
   */
  async initializeToken(): Promise<void> {
    try {
      // Get push token without requiring permissions
      const pushToken = await this.getPushToken();

      if (pushToken) {
        // Check if we already have permissions
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          this.hasRequestedPermissions = true;
        }

        // Sync with backend regardless of permission status
        await this.syncDeviceToken(pushToken);
      }
    } catch (error) {
      console.error('Error initializing token:', error);
    }
  }

  /**
   * Sync device token with backend after login
   */
  async syncTokenAfterLogin(): Promise<void> {
    // Get push token immediately (no permissions required)
    const pushToken = await this.getPushToken();

    if (pushToken) {
      await this.syncDeviceToken(pushToken);
    }
  }

  /**
   * Request notification permissions (legacy method for compatibility)
   */
  async requestPermissions(): Promise<boolean> {
    const result = await this.requestPermissionsAndGetToken();
    return result.success;
  }

  /**
   * Schedule a notification for a todo item at its due time
   */
  async scheduleTodoNotification(
    todo: TodoItem,
    listName: string
  ): Promise<void> {
    if (!todo.dueDate || todo.completed) {
      return;
    }

    const dueDate = new Date(todo.dueDate);
    const now = new Date();

    // Don't schedule notifications for past dates
    if (dueDate <= now) {
      return;
    }

    // Request permissions if we haven't already
    if (!this.hasRequestedPermissions) {
      const permissionResult = await this.requestPermissionsAndGetToken();
      if (!permissionResult.success) {
        console.log(
          'Notification permissions denied, cannot schedule notification'
        );
        return;
      }
    }

    try {
      // Cancel existing notification if any
      await this.cancelTodoNotification(todo.id);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: listName,
          body: todo.text,
          data: {
            todoId: todo.id,
            listName,
            dueDate: todo.dueDate,
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.floor((dueDate.getTime() - Date.now()) / 1000),
        },
      });

      // Store the notification ID for later cancellation
      this.notificationIds.set(todo.id, notificationId);

      console.log(
        `Scheduled notification for todo "${
          todo.text
        }" at ${dueDate.toLocaleString()}`
      );
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  /**
   * Cancel a todo notification
   */
  async cancelTodoNotification(todoId: string): Promise<void> {
    try {
      const notificationId = this.notificationIds.get(todoId);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        this.notificationIds.delete(todoId);
        console.log(`Cancelled notification for todo ${todoId}`);
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Schedule notifications for all todos with due dates
   */
  async scheduleAllTodoNotifications(
    todosWithDueDates: (TodoItem & { listName: string })[]
  ): Promise<void> {
    // Don't request permissions upfront - let individual scheduling handle it
    for (const todo of todosWithDueDates) {
      if (!todo.completed && todo.dueDate) {
        await this.scheduleTodoNotification(todo, todo.listName);
      }
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.notificationIds.clear();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Handle notification received while app is running
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Handle notification response (when user taps notification)
   */
  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = NotificationService.getInstance();
