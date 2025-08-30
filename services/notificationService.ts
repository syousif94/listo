import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
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
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
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

    try {
      // Cancel existing notification if any
      await this.cancelTodoNotification(todo.id);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Todo Due Now!',
          body: `"${todo.text}" in ${listName} is due now!`,
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
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      return;
    }

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
