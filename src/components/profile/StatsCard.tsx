import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek } from "date-fns";

interface Stats {
  totalConnections: number;
  innerCircle: number;
  hangsThisWeek: number;
}

export const StatsCard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['profile-stats'],
    queryFn: async (): Promise<Stats> => {
      const weekStart = startOfWeek(new Date());
      
      // Get contacts stats
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('closeness');
      
      if (contactsError) throw contactsError;

      // Get calendar events for this week
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', weekStart.toISOString());

      if (eventsError) throw eventsError;

      // Calculate stats
      const totalConnections = contacts?.length || 0;
      const innerCircle = contacts?.filter(c => c.closeness >= 0.8).length || 0;
      const hangsThisWeek = events?.length || 0;

      return {
        totalConnections,
        innerCircle,
        hangsThisWeek,
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Gravity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-32 rounded-lg" />
            <div className="bg-muted h-4 rounded w-3/4" />
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted h-16 rounded" />
              <div className="bg-muted h-16 rounded" />
              <div className="bg-muted h-16 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Gravity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meteorite Image */}
        <div className="relative w-full aspect-square max-w-[200px] mx-auto">
          <img
            src="/placeholder.svg"
            alt="Meteorite Level"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        {/* XP Progress */}
        <div className="space-y-2">
          <div className="text-sm text-center font-medium">Current Level: Meteorite</div>
          <Progress value={50} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{stats?.totalConnections || 0}</div>
            <div className="text-xs text-muted-foreground">Connections</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.hangsThisWeek || 0}</div>
            <div className="text-xs text-muted-foreground">Hangs</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.innerCircle || 0}</div>
            <div className="text-xs text-muted-foreground">Inner Circle</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};