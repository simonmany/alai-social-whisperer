import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
}

const CalendarView = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data === 'google-auth-success') {
        console.log('Received auth success message, refreshing session');
        const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Error refreshing session:', error);
        } else {
          console.log('Session refreshed:', newSession);
          // Force a full page reload to ensure all states are fresh
          window.location.reload();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      console.log("Starting Google Calendar connection...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/calendar`
        }
      });

      if (error) {
        console.error("Google auth error:", error);
        toast({
          title: "Error connecting to Google Calendar",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive",
        });
        throw error;
      }
      
      if (data?.url) {
        // Open auth in a popup window
        const authWindow = window.open(
          data.url, 
          '_blank', 
          'width=800,height=600'
        );
        
        if (authWindow) {
          // Poll for window closure
          const checkWindow = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkWindow);
              // The message event listener will handle the refresh
            }
          }, 500);
        }
      }
      
    } catch (error: any) {
      console.error("Calendar connection error:", error);
      toast({
        title: "Error connecting to Google Calendar",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Update query to depend on provider_token
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['calendar-events', session?.provider_token],
    queryFn: async () => {
      const currentSession = session;
      
      if (!currentSession) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to access your calendar",
          variant: "destructive",
        });
        throw new Error('No session available');
      }

      console.log("Provider token status:", currentSession.provider_token ? "Present" : "Missing");
      console.log("Session:", currentSession);

      if (!currentSession.provider_token) {
        toast({
          title: "Google Calendar Access Required",
          description: "Please connect your Google Calendar to view your events.",
          action: (
            <Button 
              variant="outline" 
              onClick={handleGoogleSignIn}
              className="flex items-center gap-2"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-4 h-4"
              />
              Connect Calendar
            </Button>
          ),
        });
        throw new Error('No Google access token available');
      }

      console.log('Calling calendar function with session token');
      const { data, error } = await supabase.functions.invoke('calendar', {
        body: {
          action: 'list',
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          access_token: currentSession.provider_token
        }
      });

      if (error) {
        console.error('Error fetching calendar events:', error);
        toast({
          title: "Error",
          description: "Failed to fetch calendar events. Please try signing out and back in.",
          variant: "destructive",
        });
        throw error;
      }

      return data?.events || [];
    },
    enabled: !!session
  });

  const groupEventsByTimeOfDay = (events: CalendarEvent[]) => {
    return {
      morning: events.filter(e => new Date(e.start_time).getHours() < 12),
      afternoon: events.filter(e => {
        const hour = new Date(e.start_time).getHours();
        return hour >= 12 && hour < 17;
      }),
      night: events.filter(e => new Date(e.start_time).getHours() >= 17),
    };
  };

  const groupEventsByDayOfWeek = (events: CalendarEvent[]) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map(day => ({
      day,
      events: events.filter(e => days[new Date(e.start_time).getDay()] === day),
    }));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-semibold text-red-600">Unable to load calendar</h2>
          <p className="text-sm text-gray-600">
            {!session?.provider_token ? 
              "Please connect your Google Calendar to view your events" : 
              "There was an error loading your calendar. Please try again."}
          </p>
          {!session?.provider_token && (
            <Button 
              onClick={handleGoogleSignIn}
              className="flex items-center gap-2"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-4 h-4"
              />
              Connect Google Calendar
            </Button>
          )}
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={true}>
      <SheetContent
        side="left"
        className="w-full sm:w-[540px] p-0"
        onPointerDownOutside={() => navigate("/")}
        showCloseButton={false}
      >
        <div className="flex flex-col h-full bg-background">
          <div className="flex items-center p-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">Calendar</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center flex-1 p-4">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-red-600">Unable to load calendar</h3>
                <p className="text-sm text-gray-600">
                  {!session?.provider_token ? 
                    "Please connect your Google Calendar to view your events" : 
                    "There was an error loading your calendar. Please try again."}
                </p>
                {!session?.provider_token && (
                  <Button 
                    onClick={handleGoogleSignIn}
                    className="flex items-center gap-2"
                  >
                    <img 
                      src="https://www.google.com/favicon.ico" 
                      alt="Google" 
                      className="w-4 h-4"
                    />
                    Connect Google Calendar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Tabs defaultValue="day" className="flex-1">
              <div className="px-4 pt-4">
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

              <TabsContent value="day" className="flex-1 p-4">
                <div className="space-y-6">
                  {Object.entries(groupEventsByTimeOfDay(events)).map(([timeOfDay, timeEvents]) => (
                    <div key={timeOfDay} className="space-y-4">
                      <h3 className="font-semibold capitalize text-muted-foreground">
                        {timeOfDay}
                      </h3>
                      {timeEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No events scheduled</p>
                      ) : (
                        timeEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-4 rounded-lg border bg-card text-card-foreground"
                          >
                            <h3 className="font-medium">{event.title}</h3>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.start_time), 'h:mm a')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="week" className="flex-1 p-4">
                <div className="space-y-6">
                  {groupEventsByDayOfWeek(events).map(({ day, events: dayEvents }) => (
                    <div key={day} className="space-y-4">
                      <h3 className="font-semibold text-muted-foreground">{day}</h3>
                      {dayEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No events scheduled</p>
                      ) : (
                        dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-4 rounded-lg border bg-card text-card-foreground"
                          >
                            <h3 className="font-medium">{event.title}</h3>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.start_time), 'h:mm a')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="month" className="flex-1 p-4">
                <Calendar
                  mode="single"
                  selected={new Date()}
                  className="rounded-md border"
                  components={{
                    DayContent: ({ date }) => {
                      const hasEvent = events.some(
                        event =>
                          new Date(event.start_time).getDate() === date.getDate() &&
                          new Date(event.start_time).getMonth() === date.getMonth()
                      );
                      return (
                        <div className="relative w-full h-full">
                          <div>{date.getDate()}</div>
                          {hasEvent && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                              <div className="h-1 w-1 bg-primary rounded-full" />
                            </div>
                          )}
                        </div>
                      );
                    },
                  }}
                />
                <div className="mt-6 space-y-4">
                  <h3 className="font-semibold text-muted-foreground">Upcoming</h3>
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming events</p>
                  ) : (
                    events.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-lg border bg-card text-card-foreground"
                      >
                        <h3 className="font-medium">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.start_time), 'PPP p')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CalendarView;