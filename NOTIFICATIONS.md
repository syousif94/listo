# Local Notifications for Todo Due Dates

This implementation adds local notifications for todos with due dates using Expo Notifications.

## Features

- **Automatic Notifications**: Todos with due dates automatically get notifications scheduled
- **Due Time Notifications**: Notifications are scheduled at the exact due time
- **Completion Handling**: Notifications are automatically canceled when todos are completed
- **Update Handling**: When todos are updated, notifications are rescheduled appropriately
- **Deletion Handling**: Notifications are canceled when todos are deleted

## How It Works

### 1. Notification Service (`services/notificationService.ts`)

The `NotificationService` is a singleton that handles all notification operations:

- **Permission Requests**: Automatically requests notification permissions
- **Scheduling**: Schedules notifications for todos with due dates
- **Canceling**: Cancels notifications when todos are completed/deleted
- **Background Handling**: Configures how notifications appear when the app is running

### 2. Store Integration (`store/todoStore.ts`)

The todo store has been enhanced with notification management:

- **Auto-scheduling**: When todos with due dates are added, notifications are automatically scheduled
- **Auto-canceling**: When todos are completed or deleted, notifications are canceled
- **Batch operations**: Methods to initialize and reschedule all notifications

### 3. Hooks (`hooks/useNotifications.ts`)

The `useNotifications` hook handles:

- **Initialization**: Sets up notifications when the app starts
- **Listeners**: Handles notification received and response events
- **Cleanup**: Properly removes listeners when components unmount

### 4. App Configuration (`app.json`)

The app configuration includes:

- **Notification Plugin**: Adds the `expo-notifications` plugin
- **Icon and Color**: Configures notification appearance
- **Android Specifics**: Sets up Android notification channels

## Usage

### Automatic Usage

Notifications work automatically once the system is initialized:

1. Add a todo with a due date
2. A notification is automatically scheduled for the exact due time
3. If you complete or delete the todo, notifications are automatically canceled

### Manual Management

You can also manually manage notifications using the `NotificationManager` component:

```tsx
import { NotificationManager } from '@/components/NotificationManager';

// Use in your component
<NotificationManager />;
```

### Custom Notification Handling

To handle notification responses (when users tap notifications):

```tsx
import { useNotifications } from '@/hooks/useNotifications';

const MyComponent = () => {
  useNotifications(); // This sets up the listeners

  // Custom handling is done in the hook, but you can extend it
  // to navigate to specific todos or lists
};
```

## Notification Types

1. **Due Date Notification**: Sent at the exact due date
   - Title: "⚠️ Todo Due Now!"
   - Body: "[Todo text] in [List name] is due now!"

## Permission Handling

The system automatically requests notification permissions when the app starts. If permissions are denied:

- Notifications won't be scheduled
- The system gracefully handles the lack of permissions
- Users can manually request permissions via the NotificationManager

## Debugging

Use the `NotificationManager` component to:

- View scheduled notifications
- Reschedule all notifications
- Request permissions manually

## Platform Considerations

### iOS

- Requires explicit permission from the user
- Shows notifications in the notification center
- Supports rich notifications with custom sounds

### Android

- Creates a notification channel automatically
- Supports vibration patterns
- Shows notifications in the status bar

## Future Enhancements

Potential improvements could include:

1. **Custom Notification Times**: Allow users to set custom reminder times (e.g., 2 hours before, 1 day before)
2. **Recurring Reminders**: For repeated todos
3. **Smart Notifications**: Different notification styles based on priority
4. **Notification Actions**: Quick actions like "Mark Complete" directly from the notification
5. **Location-based Reminders**: Notify when near a specific location
6. **Quiet Hours**: Respect user's do-not-disturb settings
