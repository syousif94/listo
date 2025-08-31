import { useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useTodoStore } from '../store/todoStore';

export const useNotifications = () => {
  const initializeNotifications = useTodoStore(
    (state) => state.initializeNotifications
  );

  useEffect(() => {
    let notificationReceivedListener: any;
    let notificationResponseListener: any;

    const setupNotifications = async () => {
      // Initialize notifications without requesting permissions upfront
      await initializeNotifications();

      // Handle notifications received while app is running
      notificationReceivedListener =
        notificationService.addNotificationReceivedListener((notification) => {
          console.log('Notification received:', notification);
          // You can add custom logic here, like updating the UI
        });

      // Handle notification responses (when user taps notification)
      notificationResponseListener =
        notificationService.addNotificationResponseReceivedListener(
          (response) => {
            console.log('Notification response:', response);
            const { todoId } = response.notification.request.content.data || {};

            // You can add navigation logic here
            // For example, navigate to the specific todo or list
            if (todoId) {
              console.log(`User tapped notification for todo: ${todoId}`);
              // Add your navigation logic here
            }
          }
        );
    };

    setupNotifications();

    return () => {
      // Clean up listeners
      if (notificationReceivedListener) {
        notificationReceivedListener.remove();
      }
      if (notificationResponseListener) {
        notificationResponseListener.remove();
      }
    };
  }, [initializeNotifications]);

  return {
    scheduleAllNotifications: useTodoStore(
      (state) => state.scheduleAllNotifications
    ),
  };
};
