import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface StatsSectionProps {
  stats: {
    connections: number;
    weeklyHangs: number;
    timeBetweenHangs: string;
    mostSeenFriend: string;
  };
}

export const StatsSection = ({ stats }: StatsSectionProps) => {
  return (
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
  );
};