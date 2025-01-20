import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Settings, Share2, Target, Users } from "lucide-react";

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Profile = ({ open, onOpenChange }: ProfileProps) => {
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
        <SheetHeader className="mb-4">
          <SheetTitle>Profile</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Profile Info */}
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-semibold">Jane Doe</h2>
              <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                <span>@janedoe</span>
                <span>•</span>
                <span>San Francisco</span>
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goals
                </CardTitle>
                <Button size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Set a new goal
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {goals.sort((a, b) => {
                const timeOrder = { tomorrow: 1, "this week": 2, "this month": 3 };
                return timeOrder[a.timeframe as keyof typeof timeOrder] - timeOrder[b.timeframe as keyof typeof timeOrder];
              }).map((goal, index) => (
                <div key={index} className="flex flex-col space-y-1">
                  <div className="text-sm font-medium">{goal.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {goal.description} ({goal.timeframe})
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Stats Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium">Connections</div>
                <div className="text-2xl font-semibold">{stats.connections}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Weekly Hangs</div>
                <div className="text-2xl font-semibold">{stats.weeklyHangs}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Time Between Hangs</div>
                <div className="text-2xl font-semibold">{stats.timeBetweenHangs}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Most Seen Friend</div>
                <div className="text-2xl font-semibold">{stats.mostSeenFriend}</div>
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
  );
};

export default Profile;