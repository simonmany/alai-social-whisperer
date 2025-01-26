import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { dummyEvents } from "@/utils/dummyData";
import { CalendarPrompts } from "@/components/CalendarPrompts";

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

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      if (!session?.user?.id) {
        console.log("No session, using dummy events");
        return dummyEvents;
      }

      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('start_time', { ascending: true });

        if (error) {
          console.error('Error fetching calendar events:', error);
          toast({
            title: "Error",
            description: "Failed to fetch calendar events. Using dummy data instead.",
            variant: "destructive",
          });
          return dummyEvents;
        }

        return data.length > 0 ? data : dummyEvents;
      } catch (error) {
        console.error('Exception in fetchCalendarEvents:', error);
        return dummyEvents;
      }
    },
    initialData: dummyEvents,
  });

  const handlePrompt = (message: string) => {
    navigate('/', { state: { prompt: message } });
  };

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
          <h2 className="text-lg font-semibold">Calendar</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !session?.provider_token ? (
          <div className="flex items-center justify-center flex-1 p-4">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">Sample Calendar View</h3>
              <p className="text-sm text-muted-foreground">
                These are example events. Connect your Google Calendar to see your real events.
              </p>
            </div>
          </div>
        ) : null}

        <Tabs defaultValue="day" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="day" className="flex-1">Day</TabsTrigger>
              <TabsTrigger value="week" className="flex-1">Week</TabsTrigger>
              <TabsTrigger value="month" className="flex-1">Month</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="day" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-6 min-h-[calc(100vh-12rem)]">
                {Object.entries(groupEventsByTimeOfDay(events)).map(([timeOfDay, timeEvents]) => (
                  <div key={timeOfDay} className="space-y-4">
                    <h3 className="font-semibold capitalize text-muted-foreground">{timeOfDay}</h3>
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
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
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
            </ScrollArea>
            <CalendarPrompts onPrompt={handlePrompt} type="day" />
          </TabsContent>

          <TabsContent value="week" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-6 min-h-[calc(100vh-12rem)]">
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
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
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
            </ScrollArea>
            <CalendarPrompts onPrompt={handlePrompt} type="week" />
          </TabsContent>

          <TabsContent value="month" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
            <div className="p-4">
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
            </div>
            <ScrollArea className="flex-1 px-4 mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-muted-foreground">Upcoming Events</h3>
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
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_time), 'PPP p')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <CalendarPrompts onPrompt={handlePrompt} type="month" />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CalendarView;
