import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import type { Database } from "@/integrations/supabase/types";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
  location?: string;
  feedback_sent?: boolean;
  mood?: string;
  feedback_notes?: string;
  attendees?: Array<{
    id: string;
    name: string;
  }>;
}

interface CalendarData {
  events: CalendarEvent[];
  isConnected: boolean;
}

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const CalendarView = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();

  const handleConnectCalendar = () => {
    navigate('/connect-calendar');
  };

  const { data: calendarData = { events: [], isConnected: false }, isLoading } = useQuery<CalendarData, Error>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      if (!session?.user?.id) return { events: [], isConnected: false };

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('google_access_token, google_refresh_token, google_token_expires_at, has_google_calendar, google_token_expired')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return { events: [], isConnected: false };
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const { data: dbEvents, error: dbError } = await supabase
          .from("calendar_events")
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            location,
            google_event_id,
            feedback_sent,
            mood,
            feedback_notes,
            event_attendees:event_attendees (
              contacts:contacts (
                id,
                name
              )
            )
          `)
          .eq("user_id", session.user.id)
          .gte("start_time", thirtyDaysAgo.toISOString())
          .lte("start_time", thirtyDaysFromNow.toISOString())
          .order("start_time", { ascending: true });

        if (dbError) {
          console.error("Error fetching calendar events:", dbError);
          toast({
            title: "Error",
            description: "Failed to fetch calendar events.",
            variant: "destructive",
          });
          return { events: [], isConnected: profile?.has_google_calendar && !profile?.google_token_expired };
        }

        const events: CalendarEvent[] = (dbEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || undefined,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location || undefined,
          google_event_id: event.google_event_id || undefined,
          feedback_sent: event.feedback_sent ?? false,
          mood: event.mood || undefined,
          feedback_notes: event.feedback_notes || undefined,
          attendees: event.event_attendees?.map(attendee => ({
            id: attendee.contacts?.id,
            name: attendee.contacts?.name
          })).filter(Boolean) || []
        }));

        return { 
          events, 
          isConnected: profile?.has_google_calendar && !profile?.google_token_expired 
        };
      } catch (error) {
        console.error("Exception in fetchCalendarEvents:", error);
        
        toast({
          title: "Error",
          description: "Failed to fetch calendar events. Please try again.",
          variant: "destructive",
        });
        return { events: [], isConnected: false };
      }
    },
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: 0
  });

  const handlePrompt = (message: string) => {
    navigate("/", { state: { prompt: message } });
  };

  return (
    <Sheet open={true}>
      <SheetContent
        side="left"
        className="w-full sm:w-[540px] p-0 flex flex-col h-full"
        onPointerDownOutside={() => navigate("/")}
        showCloseButton={false}
      >
        <div className="flex items-center p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SheetTitle>Calendar</SheetTitle>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {!calendarData.isConnected && !isLoading && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex flex-col items-center justify-center space-y-4">
                <p className="text-center text-muted-foreground">
                  Connect your Google Calendar to sync and manage your events
                </p>
                <Button onClick={handleConnectCalendar}>
                  Connect Google Calendar
                </Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="day" className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="day" className="flex-1">
                  Day
                </TabsTrigger>
                <TabsTrigger value="week" className="flex-1">
                  Week
                </TabsTrigger>
                <TabsTrigger value="month" className="flex-1">
                  Month
                </TabsTrigger>
              </TabsList>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center flex-1 p-4">
                <p className="text-center text-muted-foreground">
                  Loading events...
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <TabsContent value="day" className="h-full m-0 p-0">
                  <DayView events={calendarData.events} onPrompt={handlePrompt} />
                </TabsContent>
                <TabsContent value="week" className="h-full m-0 p-0">
                  <WeekView events={calendarData.events} onPrompt={handlePrompt} />
                </TabsContent>
                <TabsContent value="month" className="h-full m-0 p-0">
                  <MonthView events={calendarData.events} onPrompt={handlePrompt} />
                </TabsContent>
              </div>
            )}
          </Tabs>

          {calendarData.isConnected && (
            <div className="p-4 border-t mt-auto">
              <Button
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  try {
                    if (!session?.user?.id) return;

                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({
                        google_access_token: null,
                        google_refresh_token: null,
                        google_token_expires_at: null,
                        has_google_calendar: false,
                        google_token_expired: false,
                        updated_at: new Date().toISOString()
                      } satisfies Partial<ProfileUpdate>)
                      .eq('id', session.user.id);

                    if (updateError) throw updateError;

                    const { error: deleteError } = await supabase
                      .from('calendar_events')
                      .delete()
                      .eq('user_id', session.user.id);

                    if (deleteError) throw deleteError;

                    window.location.reload();
                  } catch (error) {
                    console.error("Error disconnecting calendar:", error);
                    toast({
                      title: "Error",
                      description: "Failed to disconnect calendar. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Disconnect Calendar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CalendarView;
