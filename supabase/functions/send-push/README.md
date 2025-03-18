# Send Push Notification Edge Function

This Edge Function handles sending push notifications to iOS devices using Apple Push Notification Services (APNs).

## Setup Instructions

1. **Apple Developer Account Setup**:
   - Ensure you have an Apple Developer account
   - Create an App ID with Push Notifications capability enabled
   - Create an APNs Authentication Key in your Apple Developer account
   - Note your Team ID, Key ID, and download the p8 key file

2. **Set Environment Variables**:
   - In the Supabase Dashboard, go to your project settings
   - Navigate to the Edge Functions section
   - Add the following environment variables:
     - `APPLE_TEAM_ID`: Your Apple Developer Team ID
     - `APPLE_KEY_ID`: Your APNs Authentication Key ID
     - `APPLE_KEY`: The contents of your p8 key file (as a string)
     - `APPLE_BUNDLE_ID`: Your app's bundle identifier
     - `APPLE_PRODUCTION`: Set to "true" for production, "false" for development/sandbox

3. **Deploy the Function**:
   ```bash
   supabase functions deploy send-push --project-ref your-project-ref
   ```

4. **Test the Function**:
   You can test the function by sending a POST request with the following payload:
   ```json
   {
     "token": "DEVICE_TOKEN",
     "notification": {
       "title": "Test Notification",
       "body": "This is a test notification"
     },
     "data": {
       "type": "test",
       "deepLink": "alai://app/home"
     },
     "badge": 1,
     "sound": "default"
   }
   ```

## Function Parameters

The function accepts a JSON payload with the following structure:

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | The APNs device token |
| `notification.title` | string | The title of the notification |
| `notification.body` | string | The body text of the notification |
| `data` | object | Optional key-value pairs to send as custom data |
| `badge` | number | Optional badge number to display (defaults to 1) |
| `sound` | string | Optional sound to play (defaults to "default") |
| `contentAvailable` | boolean | Optional flag for background notifications |
| `mutableContent` | boolean | Optional flag for notification service extensions |

## Error Handling

The function will return:
- `200 OK` with a success message if the notification was sent successfully
- `400 Bad Request` if the payload is invalid
- `500 Internal Server Error` if there was an error sending the notification

## Security Considerations

- This function should only be called from other trusted Edge Functions or from your backend
- Consider implementing additional authentication if needed
- The function logs only the first 10 characters of the device token for security reasons
- Store your Apple p8 key securely in environment variables

## Troubleshooting

- If notifications aren't being delivered, check that:
  - Your app has requested and received notification permissions
  - The device token is valid and correctly formatted
  - Your APNs authentication key is valid and not expired
  - You're using the correct environment (production vs. development)
