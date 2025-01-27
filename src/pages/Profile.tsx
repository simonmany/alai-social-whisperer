import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GoalsDialog from "@/components/GoalsDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Goal } from "@/types/goals";
import { checkMissingGoals } from "@/utils/goalUtils";
import { Button } from "@/components/ui/button";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { GoalsSection } from "@/components/profile/GoalsSection";
import { StatsSection } from "@/components/profile/StatsSection";
import { ActionsSection } from "@/components/profile/ActionsSection";

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stats = {
  connections: 42,
  weeklyHangs: 2.5,
  timeBetweenHangs: "4.2 days",
  mostSeenFriend: "Alex Chen",
};

const Profile = ({ open, onOpenChange }: ProfileProps) => {
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
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
    }
  });

  const handleAvatarUpdate = (newUrl: string) => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const goals = (profileData?.goals as unknown as Goal[]) || [];
  const { missingTimeframes } = checkMissingGoals(goals);

  const handleNewGoal = (message: string) => {
    setIsGoalsDialogOpen(false);
  };

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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-2">
            <SheetTitle>Profile</SheetTitle>
          </SheetHeader>

          <div className="space-y-3">
            <ProfileHeader 
              profile={profileData}
              onAvatarUpdate={handleAvatarUpdate}
            />

            {missingTimeframes.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  You haven't set any goals for {missingTimeframes.join(', ')}. 
                  Set some goals to track your social progress!
                </AlertDescription>
              </Alert>
            )}

            <GoalsSection
              goals={goals}
              onGoalComplete={handleGoalComplete}
              onSetNewGoal={() => setIsGoalsDialogOpen(true)}
              missingTimeframes={missingTimeframes}
            />

            <Button 
              size="sm" 
              className="w-full gap-2"
              onClick={() => setIsGoalsDialogOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              Set a new goal
            </Button>

            <StatsSection stats={stats} />
            <ActionsSection />
          </div>
        </SheetContent>
      </Sheet>

      <GoalsDialog
        open={isGoalsDialogOpen}
        onOpenChange={setIsGoalsDialogOpen}
        onSubmit={handleNewGoal}
      />
    </>
  );
};

export default Profile;