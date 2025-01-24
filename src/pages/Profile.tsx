import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Settings, Share2, Target, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Profile = ({ open, onOpenChange }: ProfileProps) => {
  // Fetch user profile data
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

  const goals = [
    { type: "Connection", timeframe: "tomorrow", description: "catch up with Sean" },
    { type: "Activity", timeframe: "this week", description: "try a boxing class" },
    { type: "Connection", timeframe: "this month", description: "meet someone new" },
  ];

  const stats = {
    connections: 42,
    weeklyHangs: 2.5,
    timeBetweenHangs: "4.2 days",
    mostSeenFriend: "Alex Chen",
  };

  return (
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
            <CardContent className="space-y-2">
              {goals.sort((a, b) => {
                const timeOrder = { tomorrow: 1, "this week": 2, "this month": 3 };
                return timeOrder[a.timeframe as keyof typeof timeOrder] - timeOrder[b.timeframe as keyof typeof timeOrder];
              }).map((goal, index) => (
                <div key={index} className="flex flex-col space-y-0.5">
                  <div className="text-sm font-medium">{goal.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {goal.description} ({goal.timeframe})
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button size="sm" className="w-full gap-2">
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
  );
};

export default Profile;