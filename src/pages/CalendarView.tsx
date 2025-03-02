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
import { Capacitor } from "@capacitor/core";
import { synchronizeEvents, checkPermissions } from "@/utils/calendar";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
  location?: string;
  feedback_sent?: boolean;
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

  const { data: calendarData = { events: [], isConnected: false }, isLoading, refetch } = useQuery<CalendarData, Error>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      if (!session?.user?.id) return { events: [], isConnected: false };

      try {
        // Get profile data with calendar tokens
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('google_access_token, has_google_calendar, google_token_expired, utc_offset_minutes')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw new Error('Failed to fetch user profile');
        }

        // Function to convert UTC time to local time
        const convertToLocalTime = (utcTime: string) => {
          const date = new Date(utcTime);
          return date.toISOString();
        };

        // Calculate time window (30 days before and after today)
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        // Check if we're on a native platform
        if (Capacitor.isNativePlatform()) {
          // Use native calendar sync
          const syncResult = await synchronizeEvents(session.user.id);
          if (syncResult.error) {
            console.error('Native calendar sync error:', syncResult.error);
            toast({
              title: "Calendar Sync Error",
              description: syncResult.error,
              variant: "destructive",
            });
          } else {
            console.log(`Synced ${syncResult.added} new events and updated ${syncResult.updated} events`);
          }
        } else if (profile?.has_google_calendar && !profile?.google_token_expired && profile?.google_access_token) {
          // Use Google Calendar sync for web platform
          const { data: syncResponse, error: syncError } = await supabase.functions.invoke('calendar', {
            body: {
              action: 'list',
              timeMin: thirtyDaysAgo.toISOString(),
              timeMax: thirtyDaysFromNow.toISOString(),
              google_token: profile.google_access_token
            }
          });

          if (syncError) {
            console.error('Calendar sync error:', syncError);
            throw new Error('Failed to sync calendar events');
          }

          // Check for auth errors in sync response
          if (syncResponse?.error?.type === 'auth_error') {
            await supabase
              .from('profiles')
              .update({
                google_token_expired: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', session.user.id);
          }
        }

        // Always fetch events from our database, regardless of Google Calendar connection
        const { data: dbEvents, error: dbError } = await supabase
          .from('calendar_events')
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            location,
            google_event_id,
            feedback_sent,
            event_attendees!left (
              contacts!contact_id (
                id,
                name
              )
            )
          `)
          .eq('user_id', session.user.id)
          .gte('start_time', thirtyDaysAgo.toISOString())
          .lte('start_time', thirtyDaysFromNow.toISOString())
          .order('start_time', { ascending: true });

        if (dbError) {
          console.error('Error fetching calendar events:', dbError);
          throw new Error('Failed to fetch calendar events');
        }

        // Transform database events to our format with local times
        const events: CalendarEvent[] = (dbEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || undefined,
          start_time: convertToLocalTime(event.start_time),
          end_time: convertToLocalTime(event.end_time),
          location: event.location || undefined,
          google_event_id: event.google_event_id || undefined,
          feedback_sent: event.feedback_sent,
          attendees: event.event_attendees
            ?.filter(ea => ea.contacts) // Filter out null contacts
            ?.map(attendee => ({
              id: attendee.contacts.id,
              name: attendee.contacts.name
            })) || []
        }));

        const permissions = await checkPermissions();
        // Return events with connection status
        return { 
          events,
          isConnected: (profile?.has_google_calendar && !profile?.google_token_expired) || (Capacitor.isNativePlatform() && permissions.status === 'all') 
        };
      } catch (error) {
        console.error("Exception in fetchCalendarEvents:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch calendar events. Please try again.",
          variant: "destructive",
        });
        return { events: [], isConnected: false };
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
    gcTime: 0
  });

  const handleConnectCalendar = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      if (user?.app_metadata?.provider === 'email') {
        navigate('/email-calendar/connect');
      } else {
        navigate('/connect-calendar');
      }
    }
    else {
      await CapacitorCalendar.requestFullCalendarAccess();
      synchronizeEvents(user.id);
    }
  };

  const handlePrompt = (message: string) => {
    navigate("/", { state: { prompt: message } });
  };

  return (
    <Sheet open={true}>
      <SheetContent
        side="left"
        className="w-full sm:w-[540px] p-0 flex flex-col h-full overflow-hidden"
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
                  Connect Calendar
                </Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="day" className="flex-1 flex flex-col min-h-0 w-full">
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
              <div className="flex-1 min-h-0 w-full">
                <TabsContent value="day" className="h-full m-0 p-0 w-full">
                  <DayView events={calendarData.events} onPrompt={handlePrompt} />
                </TabsContent>
                <TabsContent value="week" className="h-full m-0 p-0 w-full">
                  <WeekView events={calendarData.events} onPrompt={handlePrompt} />
                </TabsContent>
                <TabsContent value="month" className="h-full m-0 p-0 w-full">
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

                    // TODO (ari) disconnect from native calendar provider

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
