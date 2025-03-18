import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ally.alai',
  appName: 'alai',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ["sound", "alert"],
    },
  },
};

export default config;
