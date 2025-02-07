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
import { APP_CONSTANTS } from '../utils/constants';


interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
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

  const { data: calendarData = { events: [], isConnected: false }, isLoading } = useQuery<CalendarData, Error>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      if (!session?.user?.id) return { events: [], isConnected: false };

      try {
        // Get Google token from profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('google_access_token, google_refresh_token, google_token_expires_at, has_google_calendar, google_token_expired')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return { events: [], isConnected: false };
        }

        // Check if calendar is properly connected
        if (!profile?.has_google_calendar || profile.google_token_expired) {
          console.log('Calendar not properly connected:', {
            hasAccessToken: !!profile?.google_access_token,
            hasGoogleCalendar: !!profile?.has_google_calendar,
            tokenExpired: !!profile?.google_token_expired
          });
          return { events: [], isConnected: false };
        }

        // Initialize time range
        const now = new Date();
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        // Make request to calendar function
        const requestBody = {
          action: "list",
          timeMin: now.toISOString(),
          timeMax: thirtyDaysFromNow.toISOString(),
          google_token: profile.google_access_token
        };

        // Log request details
        console.log('Calendar function request details:', {
          endpoint: 'calendar',
          method: 'POST',
          payload: {
            ...requestBody,
            google_token: profile.google_access_token ? `${profile.google_access_token.substring(0, 10)}...` : null
          }
        });

        // Make the request
        const { data, error } = await supabase.functions.invoke<CalendarData>("calendar", {
          body: requestBody,
        });

        if (error) {
          console.error('Calendar function error:', error);
          throw error;
        }

        const response = data;

        if (error) {
          console.error('Calendar function error:', {
            status: error.status,
            statusText: error.statusText,
            error: error.message
          });

          // Try to parse error response
          let errorData;
          try {
            errorData = JSON.parse(error.message);
          } catch {
            errorData = { message: error.message };
          }

          // If it's an auth error, redirect to connect calendar
          if (errorData?.error === "invalid_grant") {
            toast({
              title: "Calendar access expired",
              description: "Please reconnect your Google Calendar",
              variant: "destructive",
            });
            return { events: [], isConnected: false };
          }

          throw new Error(error);
        }

        console.log('Calendar sync response:', response);

        // Fetch events from local DB
        const { data: dbEvents, error: dbError } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", session.user.id)
          .gte("start_time", now.toISOString())
          .lte("start_time", thirtyDaysFromNow.toISOString())
          .order("start_time", { ascending: true })
          .returns<CalendarEventRow[]>();

        if (dbError) {
          console.error("Error fetching calendar events:", dbError);
          toast({
            title: "Error",
            description: "Failed to fetch calendar events.",
            variant: "destructive",
          });
          return { events: [], isConnected: true };
        }

        // Map database events to CalendarEvent interface
        const events: CalendarEvent[] = (dbEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || undefined,
          start_time: event.start_time,
          end_time: event.end_time,
          google_event_id: event.google_event_id || undefined
        }));

        return { events, isConnected: true };
      } catch (error) {
        console.error("Exception in fetchCalendarEvents:", error);
        
        toast({
          title: "Error",
          description: "Failed to fetch calendar events. Please try again.",
          variant: "destructive",
        });
        return { events: [], isConnected: true };
      }
    },
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: 0
  });

  const handleConnectCalendar = async () => {
    // Get current user's provider
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return;
    }

    // Route based on provider
    if (user?.app_metadata?.provider === 'email') {
      navigate('/email-calendar/connect');
    } else {
      navigate('/connect-calendar');
    }
  };

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

        {isLoading ? (
          <div className="h-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        ) : null}

        <Tabs defaultValue="day" className="flex-1 flex flex-col">
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

          <div className="flex-1 relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
                <p className="text-center text-muted-foreground">
                  Verifying Google Calendar connection...
                </p>
              </div>
            ) : !calendarData.isConnected ? (
              <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
                <p className="text-center text-muted-foreground">
                  Connect your Google Calendar to see and manage your events
                </p>
                <Button onClick={handleConnectCalendar}>
                  Connect Google Calendar
                </Button>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1">
                  <TabsContent value="day" className="absolute inset-0">
                    <DayView events={calendarData.events} onPrompt={handlePrompt} />
                  </TabsContent>

                  <TabsContent value="week" className="absolute inset-0">
                    <WeekView events={calendarData.events} onPrompt={handlePrompt} />
                  </TabsContent>

                  <TabsContent value="month" className="absolute inset-0">
                    <MonthView events={calendarData.events} onPrompt={handlePrompt} />
                  </TabsContent>
                </div>
                <div className="p-4 border-t">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={async () => {
                      try {
                        if (!session?.user?.id) return;

                        // Clear Google tokens from profile
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

                        // Clear calendar events
                        const { error: deleteError } = await supabase
                          .from('calendar_events')
                          .delete()
                          .eq('user_id', session.user.id);

                        if (deleteError) throw deleteError;

                        // Force refetch to update UI
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
              </div>
            )}
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CalendarView;
