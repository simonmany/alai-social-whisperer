import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

// Store for the push notification token
let pushToken: string | null = null;

/**
 * Adds all the necessary listeners for push notifications
 * @param navigateToMain Optional function to navigate to the main screen when a notification is tapped
 */
export const addListeners = async (navigateToMain?: () => void) => {
  // Remove any existing listeners first to avoid duplicates
  await PushNotifications.removeAllListeners();
  
  console.log('Adding push notification listeners');
  
  await PushNotifications.addListener('registration', token => {
    console.info('Registration token received: ', token.value);
    pushToken = token.value;
    
    // Store the token in memory and save it to the database if user is logged in
    savePushToken(token.value);
  });

  await PushNotifications.addListener('registrationError', err => {
    console.error('Push registration error: ', err.error);
  });

  await PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('Push notification received: ', notification);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
    console.log('Push notification action performed', notification.actionId, notification.inputValue);
    
    // If navigateToMain is provided, use it when a notification is tapped
    if (navigateToMain && notification.notification.data?.type === 'morning_message') {
      navigateToMain();
    }
  });
}

/**
 * Saves the push notification token to the database for the current user
 * @param token The push notification token to save
 */
export const savePushToken = async (token: string) => {
  // Store the token in memory
  pushToken = token;
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in, not saving push token');
      return;
    }
    
    // Save the token to the database
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: user.id,
        push_token: token,
        device_type: Capacitor.getPlatform(),
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id, push_token'
      });
    
    if (error) {
      console.error('Error saving push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.error('Error in savePushToken:', error);
  }
}

/**
 * Gets the current push notification token
 * @returns The current push notification token, or null if not registered
 */
export const getPushToken = () => {
  return pushToken;
}

/**
 * Registers the device for push notifications
 * @param userId Optional user ID to associate with the token
 */
export const registerNotifications = async (userId?: string) => {
  // Only register on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('Not on native platform, skipping push notification registration');
    return;
  }
  
  console.log('Registering for push notifications on platform:', Capacitor.getPlatform());
  
  try {
    // Check permissions first
    let permStatus = await PushNotifications.checkPermissions();
    console.log('Initial permission status:', permStatus.receive);

    if (permStatus.receive === 'prompt') {
      console.log('Requesting push notification permissions');
      permStatus = await PushNotifications.requestPermissions();
      console.log('Permission status after request:', permStatus.receive);
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    // Register with the push notification service
    console.log('Calling PushNotifications.register()');
    await PushNotifications.register();
    console.log('PushNotifications.register() completed');
    
    // For iOS, we need to perform additional steps to ensure registration
    if (Capacitor.getPlatform() === 'ios') {
      console.log('iOS platform detected, performing additional registration steps');
      
      // Get delivered notifications to trigger iOS registration
      console.log('Getting delivered notifications to help trigger registration');
      const notifications = await PushNotifications.getDeliveredNotifications();
      console.log('Delivered notifications count:', notifications.notifications.length);
      
      // If no token received after a short delay, log a warning
      setTimeout(() => {
        if (!pushToken) {
          console.warn('No push token received after 3 seconds. iOS registration may have failed.');
          console.warn('Check that your app has the proper entitlements and capabilities for push notifications.');
        }
      }, 3000);
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
}

export const getDeliveredNotifications = async () => {
  try {
    const notificationList = await PushNotifications.getDeliveredNotifications();
    console.log('Delivered notifications:', notificationList);
    return notificationList;
  } catch (error) {
    console.error('Error getting delivered notifications:', error);
    return { notifications: [] };
  }
}

/**
 * Initializes push notifications for the app
 * @param navigateToMain Function to navigate to the main screen when a notification is tapped
 */
export const initializePushNotifications = async (navigateToMain?: () => void) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Not on native platform, skipping push notification initialization');
    return;
  }
  
  console.log('Initializing push notifications');
  
  try {
    // Add listeners first
    await addListeners(navigateToMain);
    
    // Then register for notifications
    await registerNotifications();
    
    console.log('Push notifications initialized successfully');
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}

/**
 * Sends a push notification for a morning message
 * @param messageContent The content of the message to display in the notification
 */
export const sendMorningMessageNotification = async (messageContent: string) => {
  // Only send notifications on native platforms
  if (!Capacitor.isNativePlatform()) return;
  console.log('Sending morning message notification');

  // Check permissions for push notifications
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'denied') {
    console.log('Permission to display push notifications is denied');
    return;
  }

  if (permStatus.receive !== 'granted') {
    console.log('Requesting permission to display push notifications');
    permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }
  }
  
  try {
    // Truncate message if it's too long
    const truncatedMessage = messageContent.length > 100 
      ? messageContent.substring(0, 97) + '...' 
      : messageContent;
    
    // For push notifications, we would typically send this to a server
    // which would then use FCM/APNS to deliver the notification
    // Here we're just logging that we would send this data
    console.log('Would send push notification with data:', {
      title: 'Morning Check-in',
      body: truncatedMessage,
      data: {
        type: 'morning_message'
      }
    });
    
    // Note: Actual implementation would require a server endpoint
    // that accepts this data and sends it via FCM/APNS
    
    console.log('Morning message push notification request sent');
  } catch (error) {
    console.error('Error sending morning message push notification:', error);
  }
}

/**
 * Set up notification handlers for when notifications are tapped
 * @param navigateToMain Function to navigate to the main screen
 */
export const setupNotificationHandlers = async (navigateToMain: () => void) => {
  // Set up handlers for push notifications
  await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push notification tapped:', notification);
    
    // Check if this is a morning message notification
    if (notification.notification.data?.type === 'morning_message') {
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