import { Button } from "@/components/ui/button";
import { Calendar, Users, UserRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { REDIRECT_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Goal } from "@/types/goals";
import { checkMissingGoals } from "@/utils/goalUtils";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, Dispatch, SetStateAction } from "react";

interface MainNavigationProps {
  isConnectingCalendar: boolean;
  setIsConnectingCalendar: (value: boolean) => void;
  onProfileOpen: () => void;
  onGoogleSignIn: () => Promise<void>;
}

export const MainNavigation = ({
  isConnectingCalendar,
  setIsConnectingCalendar,
  onProfileOpen,
  onGoogleSignIn,
}: MainNavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      // Get current session and user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Get profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('goals, google_access_token, google_refresh_token, google_token_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      // Check all possible token sources
      const hasValidTokens = {
        profile: !!(profile?.google_access_token && profile?.google_refresh_token),
        session: !!(session?.provider_token && session?.provider_refresh_token),
        metadata: !!(user.user_metadata?.provider_token && user.user_metadata?.provider_refresh_token)
      };

      console.log('Token status:', {
        profile: {
          hasAccessToken: !!profile?.google_access_token,
          hasRefreshToken: !!profile?.google_refresh_token,
          tokenExpiresAt: profile?.google_token_expires_at
        },
        session: {
          hasProviderToken: !!session?.provider_token,
          hasRefreshToken: !!session?.provider_refresh_token
        },
        metadata: {
          hasProviderToken: !!user.user_metadata?.provider_token,
          hasRefreshToken: !!user.user_metadata?.provider_refresh_token
        }
      });
      
      return {
        ...profile,
        hasValidTokens: hasValidTokens.profile || hasValidTokens.session || hasValidTokens.metadata
      };
    },
    refetchInterval: 5000 // Refetch every 5 seconds until we see the tokens
  });

  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const isConnected = profile.hasValidTokens;
    console.log('Calendar connection status:', isConnected ? 'Connected' : 'Not connected');

    if (isConnected !== isCalendarConnected) {
      setIsCalendarConnected(isConnected);
      if (isConnected) {
        toast({
          title: "Calendar Connected",
          description: "Your Google Calendar has been successfully connected",
        });
      }
    }
  }, [profile, isCalendarConnected, toast]);

  const { count: missingGoalsCount } = checkMissingGoals(profile?.goals as Goal[]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast({
          title: "Error signing out",
          description: "Please try again",
          variant: "destructive",
        });
      }
      navigate("/auth");
    } catch (error: any) {
      console.error("Sign out error:", error);
      navigate("/auth");
    }
  };

  const handleGoogleCalendarConnect = async () => {
    try {
      setIsConnectingCalendar(true);
      console.log("[Calendar] Starting Google Calendar connection flow...");

      // Optionally store a random state param
      const stateToken = crypto.randomUUID();
      localStorage.setItem('oauth_state', stateToken);

      console.log("[Calendar] Starting OAuth flow with:", {
        state: stateToken,
        redirectUrl: REDIRECT_URL,
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV
      });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            state: stateToken
          },
          redirectTo: REDIRECT_URL,
          skipBrowserRedirect: false
        }
      });

      if (error) {
        console.error("[Calendar] Google auth error:", error);
        toast({
          title: "Error connecting to Google Calendar",
          description: error.message || "Please try again",
          variant: "destructive",
        });
        return;
      }

      if (!data?.url) {
        console.error("[Calendar] No OAuth URL returned");
        toast({
          title: "Error connecting to Google Calendar",
          description: "Failed to start authentication",
          variant: "destructive",
        });
        return;
      }

      console.log("[Calendar] Redirecting to OAuth URL");
      window.location.href = data.url;

      if (error) {
        console.error("[Calendar] Google auth error:", error);
        toast({
          title: "Error connecting to Google Calendar",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive",
        });
        return;
      }

      console.log("[Calendar] Auth URL generated:", data?.url ? "Yes" : "No");

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("[Calendar] Calendar connection error:", error);
      toast({
        title: "Error connecting to Google Calendar",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
          <Calendar className="h-5 w-5" />
        </Button>
        <Button
          variant={isCalendarConnected ? "ghost" : "outline"}
          onClick={handleGoogleCalendarConnect}
          disabled={isConnectingCalendar || isLoading}
          className="flex items-center gap-2"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-4 h-4"
          />
          {isLoading
            ? "Loading..."
            : isConnectingCalendar
              ? "Connecting..."
              : isCalendarConnected
                ? "Calendar Connected"
                : "Connect Calendar"
          }
        </Button>
      </div>
      <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
        <Users className="h-5 w-5" />
      </Button>
      <div className="flex gap-2">
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={onProfileOpen}>
            <UserRound className="h-5 w-5" />
            {missingGoalsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {missingGoalsCount}
              </Badge>
            )}
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
