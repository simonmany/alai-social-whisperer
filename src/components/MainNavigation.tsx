import { Button } from "@/components/ui/button";
import { UserRound, Calendar, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
          google_token_expired,
          catch_up_contacts
        `)
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (!profileData) throw new Error('No profile found');

      return {
        ...profileData,
        hasGoogleCalendar: profileData?.has_google_calendar || false,
        googleTokenExpired: profileData?.google_token_expired || false,
        tokenExpiresAt: profileData?.google_token_expires_at ? new Date(profileData.google_token_expires_at) : null,
        hasAccessToken: !!profileData?.google_access_token,
        hasRefreshToken: !!profileData?.google_refresh_token,
        hasValidTokens: profileData?.has_google_calendar && !profileData?.google_token_expired,
        catchUpContacts: profileData?.catch_up_contacts || []
      };
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
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

  const handleSignOut = async () => {
    try {
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

  return (
    <div className="flex justify-between items-center w-full">
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
          </Button>
        </div>
      </div>
    </div>
  );
};
