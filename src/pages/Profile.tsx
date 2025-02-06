import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { InterestsCard } from "@/components/profile/InterestsCard";
import { SkillsRadar } from "@/components/profile/SkillsRadar";

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (message: string) => void;
}

const Profile = ({ open, onOpenChange, onSend }: ProfileProps) => {
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // First query to get auth user data
  const { data: userData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      console.log("Fetching auth user data...");
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching auth user:", error);
        throw error;
      }
      console.log("Auth user data:", user);
      return user;
    },
    enabled: open, // Only run when profile is open
  });

  // Second query to get profile data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', userData?.id],
    queryFn: async () => {
      console.log("Fetching profile data...");
      if (!userData?.id) {
        console.error("No user ID available");
        throw new Error('No user ID available');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          current_interests,
          desired_interests,
          food_preferences,
          desired_food_preferences,
          music_preferences,
          desired_music_preferences
        `)
        .eq('id', userData.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
      
      console.log("Profile data fetched:", profile);
      return profile;
    },
    enabled: !!userData?.id && open, // Only run when we have a user ID and profile is open
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
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

  const goals = (profileData?.goals as unknown as Goal[]) || [];
  const { missingTimeframes } = checkMissingGoals(goals);

  // Get the best available display name and avatar URL
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

    // Create a copy of the current goals array
    const currentGoals = Array.isArray(profileData.goals) ? [...profileData.goals] : [];
    
    // Remove the goal at the specified index
    currentGoals.splice(goalIndex, 1);

    // For legacy string goals, convert them to the new format
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
      // Invalidate the profile query to trigger a refetch
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

  const renderTimeframeSection = (timeframe: string, title: string) => {
    const timeframeGoals = goals.filter((goal: Goal) => goal.timeframe === timeframe);
    const hasGoals = timeframeGoals.length > 0;

    return (
      <div>
        <h3 className="text-sm font-bold text-primary mb-2">{title}</h3>
        {!hasGoals ? (
          <Alert 
            variant="destructive" 
            className="mb-2 cursor-pointer hover:bg-destructive/90 transition-colors"
            onClick={handleNewGoal}
          >
            <AlertDescription className="text-sm">
              Goal Missing! Set now?
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

      console.log("[Calendar] Auth URL generated:", data?.url ? "Yes" : "No");

      if (data?.url) {
        const width = 600;
        const height = 800;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        console.log("[Calendar] Opening auth popup...");
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
        } else {
          console.log("[Calendar] Auth popup opened successfully");
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-2">
            <SheetTitle>
              {showIntegrations ? (
                <Button 
                  variant="ghost" 
                  className="p-0 font-normal flex items-center gap-2"
                  onClick={() => setShowIntegrations(false)}
                >
                  <X className="h-4 w-4" /> Back to Profile
                </Button>
              ) : (
                "Profile"
              )}
            </SheetTitle>
          </SheetHeader>

          {showIntegrations ? (
            <IntegrationsMenu
              onGoogleSignIn={handleGoogleCalendarConnect}
              isConnectingCalendar={isConnectingCalendar}
            />
          ) : (
            <div className="space-y-3">
              {/* Profile Info */}
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
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>@{username}</span>
                        <span>•</span>
                        <span>{profileData?.city || 'Location not set'}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Instagram</Button>
                  <Button variant="outline" size="sm">Twitter</Button>
                </div>
              </div>

              {/* Goals Alert */}
              {missingTimeframes.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    You haven't set any goals for {missingTimeframes.join(', ')}. 
                    Set some goals to track your social progress!
                  </AlertDescription>
                </Alert>
              )}

              {/* Goals Section */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderTimeframeSection('today', 'Today')}
                  {renderTimeframeSection('week', 'This Week')}
                  {renderTimeframeSection('month', 'This Month')}
                </CardContent>
              </Card>

              <Button 
                size="sm" 
                className="w-full gap-2"
                onClick={handleNewGoal}
              >
                <MessageCircle className="h-4 w-4" />
                Set a new goal
              </Button>

              {/* Interests Section - Moved below Goals */}

              {/* Replace InterestsCard with SkillsRadar */}
              <SkillsRadar
                skills={{
                  gourmand: profileData?.skill_gourmand || 0,
                  aesthete: profileData?.skill_aesthete || 0,
                  traveler: profileData?.skill_traveler || 0,
                  athlete: profileData?.skill_athlete || 0,
                  reveler: profileData?.skill_reveler || 0,
                }}
              />

              {/* Stats Section */}
              <StatsCard />

              {/* Actions */}
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
    </>
  );
};

export default Profile;
