import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Settings, Share2, Target, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import GoalsDialog from "@/components/GoalsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, Json } from "@/integrations/supabase/types";

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Goal {
  [key: string]: string | boolean; // Make Goal compatible with Json type
  type: string;
  description: string;
  timeframe: string;
  completed: boolean;
  created_at: string;
}

type Profile = Database['public']['Tables']['profiles']['Row'];

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

  const goals = (profileData?.goals as unknown as Goal[]) || [];

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
      .update({ goals: updatedGoals as unknown as Json[] })
      .eq('id', user.id);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsGoalsDialogOpen(true);
    }
  };

  const filterGoalsByTimeframe = (timeframe: string) => {
    return goals.filter((goal: Goal) => goal.timeframe === timeframe);
  };

  const stats = {
    connections: 42,
    weeklyHangs: 2.5,
    timeBetweenHangs: "4.2 days",
    mostSeenFriend: "Alex Chen",
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
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileData?.avatar_url} />
                <AvatarFallback>
                  {profileData?.display_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-lg font-semibold">{profileData?.display_name || 'User'}</h2>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>@{profileData?.username || 'user'}</span>
                  <span>•</span>
                  <span>{profileData?.city || 'Location not set'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Instagram</Button>
                <Button variant="outline" size="sm">Twitter</Button>
              </div>
            </div>

            {/* Goals Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Today's Goals */}
                <div>
                  <h3 className="text-sm font-bold text-primary mb-2">Today</h3>
                  {filterGoalsByTimeframe('today').map((goal: Goal, index: number) => (
                    <div key={index} className="mb-2 flex items-start gap-2">
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={() => handleGoalComplete(index)}
                        className="mt-1"
                      />
                      <div>
                        <div className={`text-sm font-medium ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {goal.type}
                        </div>
                        <div className={`text-xs text-muted-foreground ${goal.completed ? 'line-through' : ''}`}>
                          {goal.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* This Week's Goals */}
                <div>
                  <h3 className="text-sm font-bold text-primary mb-2">This Week</h3>
                  {filterGoalsByTimeframe('week').map((goal: Goal, index: number) => (
                    <div key={index} className="mb-2 flex items-start gap-2">
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={() => handleGoalComplete(index)}
                        className="mt-1"
                      />
                      <div>
                        <div className={`text-sm font-medium ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {goal.type}
                        </div>
                        <div className={`text-xs text-muted-foreground ${goal.completed ? 'line-through' : ''}`}>
                          {goal.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* This Month's Goals */}
                <div>
                  <h3 className="text-sm font-bold text-primary mb-2">This Month</h3>
                  {filterGoalsByTimeframe('month').map((goal: Goal, index: number) => (
                    <div key={index} className="mb-2 flex items-start gap-2">
                      <Checkbox
                        checked={goal.completed}
                        onCheckedChange={() => handleGoalComplete(index)}
                        className="mt-1"
                      />
                      <div>
                        <div className={`text-sm font-medium ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {goal.type}
                        </div>
                        <div className={`text-xs text-muted-foreground ${goal.completed ? 'line-through' : ''}`}>
                          {goal.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button 
              size="sm" 
              className="w-full gap-2"
              onClick={() => setIsGoalsDialogOpen(true)}
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

            <Button size="sm" className="w-full gap-2">
              <MessageCircle className="h-4 w-4" />
              Ask Al about your stats
            </Button>

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
        onSubmit={handleNewGoal}
      />
    </>
  );
};

export default Profile;