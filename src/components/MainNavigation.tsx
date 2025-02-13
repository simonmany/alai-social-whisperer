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
import { APP_CONSTANTS } from '../utils/constants';
import { useAuth } from "@/components/AuthProvider";

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
  const { session } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) throw new Error('No session found');
      
      // Get profile data with all fields
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          city,
          skill_gourmand,
          skill_aesthete,
          skill_traveler,
          skill_athlete,
          skill_reveler,
          display_name,
          goals,
          utc_offset_minutes,
          onboarding_step,
          has_completed_tutorial,
          google_access_token,
          google_refresh_token,
          google_token_expires_at,
          has_google_calendar,
          google_token_expired
        `)
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (!profileData) throw new Error('No profile found');

      // Format profile data
      const formattedProfile = {
        ...profileData,
        hasGoogleCalendar: profileData?.has_google_calendar || false,
        googleTokenExpired: profileData?.google_token_expired || false,
        tokenExpiresAt: profileData?.google_token_expires_at ? new Date(profileData.google_token_expires_at) : null,
        hasAccessToken: !!profileData?.google_access_token,
        hasRefreshToken: !!profileData?.google_refresh_token,
        hasValidTokens: profileData?.has_google_calendar && !profileData?.google_token_expired
      };

      return formattedProfile;
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
          redirectTo: `${APP_CONSTANTS.SITE_URL}/calendar/callback`,
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