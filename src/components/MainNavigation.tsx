import { Button } from "@/components/ui/button";
import { UserRound, Calendar, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { REDIRECT_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
}: MainNavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      // Get current session and user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Get profile data with all fields
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          google_access_token,
          google_refresh_token,
          google_token_expires_at,
          has_google_calendar,
          google_token_expired
        `)
        //.select('goals, onboarding_step')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      console.log('Raw profile data:', {
        hasGoogleCalendar: profile?.has_google_calendar,
        googleTokenExpired: profile?.google_token_expired,
        hasAccessToken: !!profile?.google_access_token,
        hasRefreshToken: !!profile?.google_refresh_token,
        tokenExpiresAt: profile?.google_token_expires_at,
        provider: session?.user?.app_metadata?.provider,
        userId: user.id
      });
      
      // Format profile data
      const formattedProfile = {
        ...profile,
        hasGoogleCalendar: profile?.has_google_calendar || false,
        googleTokenExpired: profile?.google_token_expired || false,
        tokenExpiresAt: profile?.google_token_expires_at ? new Date(profile.google_token_expires_at) : null,
        hasAccessToken: !!profile?.google_access_token,
        hasRefreshToken: !!profile?.google_refresh_token
      };

      // Check if calendar is properly connected and tokens are valid
      const hasValidTokens = formattedProfile.hasGoogleCalendar && !formattedProfile.googleTokenExpired;

      console.log('Token status:', {
        hasAccessToken: formattedProfile.hasAccessToken,
        hasRefreshToken: formattedProfile.hasRefreshToken,
        tokenExpiresAt: formattedProfile.tokenExpiresAt,
        isExpired: formattedProfile.tokenExpiresAt ? formattedProfile.tokenExpiresAt <= new Date() : true,
        hasGoogleCalendar: formattedProfile.hasGoogleCalendar,
        googleTokenExpired: formattedProfile.googleTokenExpired,
        hasValidTokens,
        userId: user.id
      });
      
      return {
        ...profile,
        ...formattedProfile,
        hasValidTokens
      };
    },
    refetchInterval: 5000, // Refetch every 5 seconds until we see the tokens
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 0 // Consider data immediately stale to ensure we get fresh data
  });

  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const isConnected = profile.hasValidTokens;
    console.log('Calendar connection status:', isConnected ? 'Connected' : 'Not connected', {
      userId: profile.id
    });

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
      // Clear profile data before signing out
      queryClient.setQueryData(['profile'], null);
      setIsCalendarConnected(false);

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
      console.log("[Calendar] Starting Google Calendar connection flow...");

      // Get current user's provider
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // If user is signed in with email, redirect to email calendar flow
      if (user.app_metadata.provider === 'email') {
        navigate('/email-calendar/connect');
        return;
      }

      // Only set connecting state for Google sign-in users
      setIsConnectingCalendar(true);

      // For Google sign-in users, continue with existing flow
      const stateToken = crypto.randomUUID();
      localStorage.setItem('oauth_state', stateToken);

      console.log("[Calendar] Starting OAuth flow with:", {
        state: stateToken,
        redirectUrl: REDIRECT_URL,
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        userId: user.id
      });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            state: stateToken
          },
          redirectTo: `${import.meta.env.VITE_PUBLIC_SITE_URL}/calendar/callback`,
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
    <div className="flex justify-between items-center gap-2 mb-6">
      <div className="flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/calendar')}
          aria-label="Open calendar"
        >
          <Calendar className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 flex items-center">
        <Button
          variant={isCalendarConnected ? "ghost" : "outline"}
          onClick={handleGoogleCalendarConnect}
          disabled={isConnectingCalendar || isLoading || isCalendarConnected}
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
      <div className="flex-1 flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/contacts')}
          aria-label="Open contacts"
        >
          <Users className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 flex justify-end">
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onProfileOpen}
            aria-label="Open profile"
          >
            <UserRound className="h-5 w-5" />
            {missingGoalsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
              >
                {missingGoalsCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};