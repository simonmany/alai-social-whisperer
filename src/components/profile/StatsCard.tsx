import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek } from "date-fns";

interface Stats {
  totalConnections: number;
  innerCircle: number;
  hangsThisWeek: number;
  friendsSeenThisWeek: number;
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
        .select('title, description')
        .gte('start_time', weekStart.toISOString());

      if (eventsError) throw eventsError;

      // Calculate stats
      const totalConnections = contacts?.length || 0;
      const innerCircle = contacts?.filter(c => c.closeness >= 0.8).length || 0;
      const hangsThisWeek = events?.length || 0;
      
      // Estimate unique friends seen from event titles/descriptions
      // This is a simple estimation - could be improved with better event tracking
      const uniqueFriends = new Set(
        events?.map(e => 
          [e.title, e.description]
            .join(' ')
            .toLowerCase()
            .match(/[a-z]+/g)
        ).flat()
      );
      const friendsSeenThisWeek = Math.min(uniqueFriends.size, totalConnections);

      return {
        totalConnections,
        innerCircle,
        hangsThisWeek,
        friendsSeenThisWeek
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <div className="animate-pulse bg-muted h-16 rounded" />
          <div className="animate-pulse bg-muted h-16 rounded" />
          <div className="animate-pulse bg-muted h-16 rounded" />
          <div className="animate-pulse bg-muted h-16 rounded" />
        </CardContent>
      </Card>
    );
  }

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
          <div className="text-sm font-medium">Total Connections</div>
          <div className="text-lg font-semibold">{stats?.totalConnections || 0}</div>
        </div>
        <div>
          <div className="text-sm font-medium">Inner Circle</div>
          <div className="text-lg font-semibold">{stats?.innerCircle || 0}</div>
        </div>
        <div>
          <div className="text-sm font-medium">Hangs This Week</div>
          <div className="text-lg font-semibold">{stats?.hangsThisWeek || 0}</div>
        </div>
        <div>
          <div className="text-sm font-medium">Friends Seen</div>
          <div className="text-lg font-semibold">{stats?.friendsSeenThisWeek || 0}</div>
        </div>
      </CardContent>
    </Card>
  );
};