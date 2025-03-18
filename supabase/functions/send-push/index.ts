// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/manual/examples/supabase_functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

// Interface for the push notification payload
interface PushNotificationPayload {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  contentAvailable?: boolean;
  mutableContent?: boolean;
}

// Helper function to generate JWT for APNs
async function generateApnsJwt(): Promise<string> {
  const teamId = Deno.env.get("APPLE_TEAM_ID");
  const keyId = Deno.env.get("APPLE_KEY_ID");
  const keyContent = Deno.env.get("APPLE_KEY");

  if (!teamId || !keyId || !keyContent) {
    throw new Error("Missing APNs credentials. Please set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_KEY environment variables.");
  }

  try {
    // Convert the base64 key to a proper PEM format
    const pemKey = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----`;
    
    // Import the key
    const privateKey = await jose.importPKCS8(pemKey, "ES256");
    
    // Create and sign the JWT
    const jwt = await new jose.SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
    
    return jwt;
  } catch (error) {
    console.error("Error generating JWT:", error);
    throw error;
  }
}

// Function to send push notification
async function sendPushNotification(deviceToken: string, payload: any): Promise<any> {
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID");
  const production = Deno.env.get("APPLE_PRODUCTION") === "true";
  
  if (!bundleId) {
    throw new Error("Missing APPLE_BUNDLE_ID environment variable");
  }
  
  try {
    // Generate JWT for authentication
    const jwt = await generateApnsJwt();
    
    // Determine APNs server URL based on environment
    const apnsHost = production 
      ? "https://api.push.apple.com" 
      : "https://api.sandbox.push.apple.com";
    
    // Construct the URL
    const url = `${apnsHost}/3/device/${deviceToken}`;
    
    // Set up headers
    const headers = {
      "authorization": `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": `${Math.floor(Date.now() / 1000) + 3600}`,
      "content-type": "application/json"
    };
    
    // Send the request
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    
    // Get the APNs ID from the response headers
    const apnsId = response.headers.get("apns-id");
    
    // Check if the request was successful
    if (response.status === 200) {
      return { 
        success: true, 
        statusCode: response.status,
        apnsId 
      };
    } else {
      const errorData = await response.json().catch(() => ({ reason: "Unknown error" }));
      return { 
        success: false, 
        statusCode: response.status,
        error: errorData,
        apnsId
      };
    }
  } catch (error) {
    console.error("Error in sendPushNotification:", error);
    throw error;
  }
}

serve(async (req) => {
  try {
    // CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers });
    }

    // Get the request payload
    const payload: PushNotificationPayload = await req.json();
    
    // Validate the payload
    if (!payload.token || !payload.notification) {
      return new Response(
        JSON.stringify({ error: "Invalid payload. Token and notification are required." }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending push notification:", JSON.stringify({
      token: payload.token.substring(0, 10) + "...", // Truncate token for security
      notification: payload.notification,
      data: payload.data
    }));

    // Prepare the APNs payload
    const apnsPayload = {
      aps: {
        alert: {
          title: payload.notification.title,
          body: payload.notification.body,
        },
        badge: payload.badge !== undefined ? payload.badge : 0,
        sound: payload.sound || "default",
        "content-available": payload.contentAvailable ? 1 : undefined,
        "mutable-content": payload.mutableContent ? 1 : undefined,
      },
      // Include custom data
      ...payload.data,
    };

    // Send the notification
    const result = await sendPushNotification(payload.token, apnsPayload);
    
    if (result.success) {
      console.log("Successfully sent push notification to APNs");
      return new Response(
        JSON.stringify({ 
          success: true, 
          apnsId: result.apnsId 
        }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Failed to send push notification:", result.error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send push notification", 
          details: result.error?.reason || "Unknown error",
          statusCode: result.statusCode
        }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to send push notification", 
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
