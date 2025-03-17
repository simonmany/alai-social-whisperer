import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Sends a push notification for a morning message
 * @param messageContent The content of the message to display in the notification
 */
export const sendMorningMessageNotification = async (messageContent: string) => {
  // Only send notifications on native platforms
  if (!Capacitor.isNativePlatform()) return;
  console.log('Sending morning message notification');

  const permissionState = await LocalNotifications.checkPermissions();

  if (permissionState.display === 'denied') {
    console.log('Permission to display notifications is denied');
    return;
  }

//   if (permissionState.display !== 'granted') {
//     console.log('Requesting permission to display notifications');
//     await LocalNotifications.requestPermissions();
//   }
  
  try {
    // Truncate message if it's too long
    const truncatedMessage = messageContent.length > 100 
      ? messageContent.substring(0, 97) + '...' 
      : messageContent;
    
    // Use LocalNotifications for immediate display
    await LocalNotifications.schedule({
      notifications: [
        {
          id: new Date().getTime(),
          title: 'Morning Check-in',
          body: truncatedMessage,
          extra: {
            type: 'morning_message'
          }
        }
      ]
    });
    
    console.log('Morning message notification sent');
  } catch (error) {
    console.error('Error sending morning message notification:', error);
  }
}

/**
 * Set up notification handlers for when notifications are tapped
 * @param navigateToMain Function to navigate to the main screen
 */
export const setupNotificationHandlers = async (navigateToMain: () => void) => {
  await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    console.log('Notification tapped:', notification);
    
    // Check if this is a morning message notification
    if (notification.notification.extra?.type === 'morning_message') {
      // Navigate to main screen
      navigateToMain();
    }
  });
}

export const setupLocalNotifications = async () => {
    const permissionState = await LocalNotifications.checkPermissions();

    if (permissionState.display === 'denied') {
        console.log('Permission to display notifications is denied');
        return;
        }

        if (permissionState.display !== 'granted') {
        console.log('Requesting permission to display notifications');
        await LocalNotifications.requestPermissions();
        }
        return;
    }