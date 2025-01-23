import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { storeGoogleTokens } from "@/utils/googleAuth";

export const GoogleCalendarAuth = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      try {
        if (event.data?.type === 'google-auth-success') {
          console.log('[GoogleCalendarAuth] Received success message');
          
          await storeGoogleTokens({
            access_token: event.data.access_token,
            refresh_token: event.data.refresh_token,
            expires_at: event.data.expires_at
          });

          toast({
            title: "Google Calendar Connected",
            description: "Your calendar has been successfully connected!",
          });

          // Notify parent window to refresh calendar data
          window.opener?.postMessage('calendar-refresh-needed', window.location.origin);
          
          // Close the popup
          window.close();
        }
      } catch (error) {
        console.error('[GoogleCalendarAuth] Error handling message:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect Google Calendar. Please try again.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

  const handleGoogleCalendarConnect = async () => {
    try {
      console.log("[Calendar] Starting Google Calendar connection flow...");
      
      // Calculate popup dimensions and position
      const width = 600;
      const height = 800;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Open the popup window first
      const popup = window.open(
        'about:blank',
        'googleAuthWindow',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      );
      
      if (!popup) {
        throw new Error("Popup was blocked. Please allow popups for this site.");
      }

      const { data: session } = await supabase.auth.getSession();
      console.log("[Calendar] Current session status:", session ? "Has session" : "No session");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true
        }
      });

      if (error) {
        console.error("[Calendar] Google auth error:", error);
        popup.close();
        throw error;
      }

      if (data?.url) {
        // Navigate the popup to the OAuth URL
        popup.location.href = data.url;
        
        // Keep checking if the popup is closed
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            console.log("[Calendar] Auth popup was closed");
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error("[Calendar] Calendar connection error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect Google Calendar",
        variant: "destructive",
      });
    }
  };

  return null; // This component only handles the authentication flow
};

export default GoogleCalendarAuth;
