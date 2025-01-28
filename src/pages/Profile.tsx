import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Settings, Share2, Target, Users, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GoalsDialog from "@/components/GoalsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Goal } from "@/types/goals";
import { checkMissingGoals } from "@/utils/goalUtils";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { generateChatResponse } from "@/utils/openai";
import { useToast } from "@/hooks/use-toast";

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (message: string) => void;
}

const Profile = ({ open, onOpenChange, onSend }: ProfileProps) => {
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    },
    staleTime: 1000 * 60 * 5,
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

  const handleGoalComplete = async (goalIndex: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updatedGoals = [...goals];
    updatedGoals[goalIndex].completed = true;

    const { error } = await supabase
      .from('profiles')
      .update({ goals: updatedGoals })
      .eq('id', user.id);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsGoalsDialogOpen(true);
    }
  };

  const handleDeleteGoal = async (goalIndex: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updatedGoals = goals.filter((_, index) => index !== goalIndex);

    const { error } = await supabase
      .from('profiles')
      .update({ goals: updatedGoals })
      .eq('id', user.id);

    if (!error) {
      toast({
        title: "Goal deleted",
        description: "Your goal has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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

  const stats = {
    connections: 42,
    weeklyHangs: 2.5,
    timeBetweenHangs: "4.2 days",
    mostSeenFriend: "Alex Chen",
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-2">
            <SheetTitle>Profile</SheetTitle>
          </SheetHeader>

          <div className="space-y-3">
            {/* Profile Info */}
            <div className="flex flex-col items-center space-y-2">
              {isLoading ? (
                <Skeleton className="h-24 w-24 rounded-full" />
              ) : (
                <AvatarUpload
                  url={profileData?.avatar_url}
                  onUploadComplete={handleAvatarUpdate}
                  fallback={profileData?.display_name?.charAt(0) || 'U'}
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
                    <h2 className="text-lg font-semibold">{profileData?.display_name || 'User'}</h2>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>@{profileData?.username || 'user'}</span>
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

            {/* Stats Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm font-medium">Connections</div>
                  <div className="text-lg font-semibold">{stats.connections}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Weekly Hangs</div>
                  <div className="text-lg font-semibold">{stats.weeklyHangs}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Time Between Hangs</div>
                  <div className="text-lg font-semibold">{stats.timeBetweenHangs}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Most Seen Friend</div>
                  <div className="text-lg font-semibold">{stats.mostSeenFriend}</div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Share2 className="h-4 w-4" />
                Integrations
              </Button>
            </div>
          </div>
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
