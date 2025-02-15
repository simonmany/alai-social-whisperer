import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, MessageCircle, Settings, Share2, Target, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GoalsDialog from "@/components/GoalsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Goal } from "@/types/goals";
import { checkMissingGoals } from "@/utils/goalUtils";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/profile/StatsCard";
import { useToast } from "@/hooks/use-toast";
import { IntegrationsMenu } from "@/components/profile/IntegrationsMenu";
import { SkillsRadar } from "@/components/profile/SkillsRadar";
import { InterestsCard } from "@/components/profile/InterestsCard";
import Autocomplete from 'react-google-autocomplete';

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (message: string) => void;
}

const Profile = ({ open, onOpenChange, onSend }: ProfileProps) => {
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userData, isSuccess: isAuthReady } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      console.log("Fetching auth user data...");
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching auth user:", error);
        throw error;
      }
      if (!user) {
        console.error("No user found in auth response");
        throw new Error('No user found');
      }
      console.log("Auth user data:", user);
      return user;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', userData?.id],
    queryFn: async () => {
      console.log("Fetching profile data...");
      console.log("Auth state:", { 
        isReady: isAuthReady,
        hasUserId: !!userData?.id, 
        userId: userData?.id,
        isOpen: open 
      });

      if (!userData?.id) {
        console.error("No user ID available for profile fetch");
        throw new Error('No user ID available');
      }

      console.log("Querying for user ID:", userData.id);

      const { data: profile, error } = await supabase
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
          long_term_goals,
          current_interests,
          desired_interests,
          food_preferences,
          desired_food_preferences,
          music_preferences,
          desired_music_preferences,
          utc_offset_minutes,
          onboarding_step,
          has_completed_tutorial,
          google_access_token,
          google_refresh_token,
          google_token_expires_at,
          has_google_calendar,
          google_token_expired
        `)
        .eq('id', userData.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
      
      if (!profile) {
        console.error("No profile found for user:", userData.id);
        throw new Error('No profile found');
      }

      const formattedProfile = {
        ...profile,
        hasGoogleCalendar: profile?.has_google_calendar || false,
        googleTokenExpired: profile?.google_token_expired || false,
        tokenExpiresAt: profile?.google_token_expires_at ? new Date(profile.google_token_expires_at) : null,
        hasAccessToken: !!profile?.google_access_token,
        hasRefreshToken: !!profile?.google_refresh_token,
        hasValidTokens: profile?.has_google_calendar && !profile?.google_token_expired,
        goals: (profile?.goals || []) as Goal[],
        long_term_goals: (profile?.long_term_goals || []) as Goal[],
        current_interests: (profile?.current_interests || []) as string[],
        desired_interests: (profile?.desired_interests || []) as string[],
        food_preferences: (profile?.food_preferences || []) as string[],
        desired_food_preferences: (profile?.desired_food_preferences || []) as string[],
        music_preferences: (profile?.music_preferences || []) as string[],
        desired_music_preferences: (profile?.desired_music_preferences || []) as string[]
      };

      console.log("Complete profile data:", formattedProfile);
      return formattedProfile;
    },
    enabled: isAuthReady && !!userData?.id && open,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  console.log("Final profileData being used:", profileData);

  useQuery({
    queryKey: ['maps-key'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        if (error) throw error;
        if (data?.apiKey) {
          setMapsApiKey(data.apiKey);
        }
        return data;
      } catch (error) {
        console.error('Error fetching Maps API key:', error);
        toast({
          title: "Error loading location selector",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      }
    },
    enabled: open,
    staleTime: Infinity,
    gcTime: Infinity, // Renamed from cacheTime
  });

  const handleGoalSubmit = async (message: string) => {
    if (onSend) {
      onSend(message);
      setIsGoalsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: "Goal added",
        description: "Your new goal has been set successfully",
      });
    }
  };

  const handleAvatarUpdate = async (newUrl: string) => {
    queryClient.setQueryData(['profile'], (oldData: any) => ({
      ...oldData,
      avatar_url: newUrl
    }));
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const handleLocationUpdate = async (place: any) => {
    if (!place || typeof place !== 'object') return;

    const address = place.formatted_address || place.name || '';
    const offset = parseInt(place.utc_offset_minutes) || -240;

    if (!address) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          city: address,
          utc_offset_minutes: offset
        })
        .eq('id', userData.id);

      if (error) throw error;
      
      setIsLocationDialogOpen(false);
      
      toast({
        title: "Location Updated",
        description: "Your location has been updated successfully",
      });

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive"
      });
    }
  };

  const goals = (profileData?.goals as unknown as Goal[]) || [];
  const { missingTimeframes } = checkMissingGoals(goals);

  const displayName = profileData?.display_name || userData?.user_metadata?.name || 'User';
  const avatarUrl = profileData?.avatar_url || userData?.user_metadata?.avatar_url;
  const username = profileData?.username || 
                  userData?.user_metadata?.username || 
                  displayName.toLowerCase().replace(/\s+/g, '');

  const handleGoalComplete = async (goalIndex: number) => {
    if (!userData?.id) return;

    const updatedGoals = [...goals];
    updatedGoals[goalIndex].completed = true;

    const { error } = await supabase
      .from('profiles')
      .update({ goals: updatedGoals })
      .eq('id', userData.id);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsGoalsDialogOpen(true);
    }
  };

  const handleDeleteGoal = async (goalIndex: number) => {
    if (!userData?.id || !profileData) return;

    const currentGoals = Array.isArray(profileData.goals) ? [...profileData.goals] : [];
    currentGoals.splice(goalIndex, 1);

    const formattedGoals = currentGoals.map(goal => {
      if (typeof goal === 'string') {
        return {
          type: "Connection",
          description: goal.toLowerCase(),
          timeframe: "today",
          completed: false,
          created_at: new Date().toISOString()
        };
      }
      return goal;
    });

    const { error } = await supabase
      .from('profiles')
      .update({ goals: formattedGoals })
      .eq('id', userData.id);

    if (!error) {
      toast({
        title: "Goal deleted",
        description: "Your goal has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['profile', userData.id] });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewGoal = () => {
    onOpenChange(false);
    setIsGoalsDialogOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleGoogleCalendarConnect = async () => {
    try {
      setIsConnectingCalendar(true);
      console.log("[Calendar] Starting Google Calendar connection flow...");
      
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
        toast({
          title: "Error connecting to Google Calendar",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        const width = 600;
        const height = 800;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const newWindow = window.open(
          data.url,
          'googleAuthWindow',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!newWindow) {
          console.error("[Calendar] Popup blocked by browser");
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site to connect your Google Calendar.",
            variant: "destructive",
          });
        }
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

  const renderTimeframeSection = (timeframe: string, title: string) => {
    const timeframeGoals = goals.filter((goal: Goal) => goal.timeframe === timeframe);
    const hasGoals = timeframeGoals.length > 0;

    const alertText = {
      today: "Set Daily Goal",
      week: "Set Weekly Goal",
      month: "Set Monthly Goal"
    }[timeframe];

    return (
      <div>
        <h3 className="text-sm font-bold text-primary mb-2">{title}</h3>
        {!hasGoals ? (
          <Alert 
            variant="destructive" 
            className="mb-2 cursor-pointer hover:bg-destructive/90 transition-colors py-2"
            onClick={handleNewGoal}
          >
            <AlertDescription className="text-sm">
              {alertText}
            </AlertDescription>
          </Alert>
        ) : (
          timeframeGoals.map((goal: Goal, index: number) => (
            <div key={index} className="mb-2 flex items-start gap-2">
              <Checkbox
                checked={goal.completed}
                onCheckedChange={() => handleGoalComplete(index)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className={`text-sm font-medium ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {goal.type}
                </div>
                <div className={`text-xs text-muted-foreground ${goal.completed ? 'line-through' : ''}`}>
                  {goal.description}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDeleteGoal(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          {showIntegrations ? (
            <IntegrationsMenu
              onGoogleSignIn={handleGoogleCalendarConnect}
              isConnectingCalendar={isConnectingCalendar}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col items-center space-y-2">
                {isLoading ? (
                  <Skeleton className="h-24 w-24 rounded-full" />
                ) : (
                  <AvatarUpload
                    url={avatarUrl}
                    onUploadComplete={handleAvatarUpdate}
                    fallback={displayName?.charAt(0) || 'U'}
                    size="lg"
                  />
                )}
                <div className="text-center">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold">{displayName}</h2>
                      <div className="text-xs text-muted-foreground">
                        @{username} • {profileData?.city ? (
                          profileData.city
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setIsLocationDialogOpen(true)}
                          >
                            Set location
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Card>
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {renderTimeframeSection('today', 'Today')}
                  {renderTimeframeSection('week', 'This Week')}
                  {renderTimeframeSection('month', 'This Month')}
                </CardContent>
              </Card>

              <InterestsCard
                currentInterests={profileData?.current_interests}
                desiredInterests={profileData?.desired_interests}
                foodPreferences={profileData?.food_preferences}
                desiredFoodPreferences={profileData?.desired_food_preferences}
                musicPreferences={profileData?.music_preferences}
                desiredMusicPreferences={profileData?.desired_music_preferences}
              />

              <Button 
                size="sm" 
                className="w-full gap-2"
                onClick={handleNewGoal}
              >
                <MessageCircle className="h-4 w-4" />
                Set a new goal
              </Button>

              <SkillsRadar
                skills={{
                  gourmand: profileData?.skill_gourmand ?? 0,
                  aesthete: profileData?.skill_aesthete ?? 0,
                  traveler: profileData?.skill_traveler ?? 0,
                  athlete: profileData?.skill_athlete ?? 0,
                  reveler: profileData?.skill_reveler ?? 0,
                }}
              />

              <StatsCard />

              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowIntegrations(true)}
                >
                  <Share2 className="h-4 w-4" />
                  Integrations
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <GoalsDialog
        open={isGoalsDialogOpen}
        onOpenChange={setIsGoalsDialogOpen}
        onSubmit={handleGoalSubmit}
      />

      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Location</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {mapsApiKey ? (
              <Autocomplete
                apiKey={mapsApiKey}
                onPlaceSelected={(place) => handleLocationUpdate(place)}
                options={{
                  types: ['(cities)'],
                  fields: ['formatted_address', 'utc_offset_minutes']
                }}
                className="w-full px-4 py-2 text-gray-700 bg-white border rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your city..."
              />
            ) : (
              <div className="text-sm text-gray-500">Loading location selector...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
