import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { dummyEvents } from "@/utils/dummyData";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";

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

  return (
    <Sheet open={true}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] p-0 flex flex-col h-full"
        onPointerDownOutside={(e) => {
          e.preventDefault();
          navigate("/");
        }}
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
          <div className="h-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        ) : !session?.provider_token ? (
          <div className="px-4 py-1 bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              Sample calendar events shown. Connect Google Calendar to see your events.
            </p>
          </div>
        ) : null}

        <Tabs defaultValue="day" className="flex-1 flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="day" className="flex-1">Day</TabsTrigger>
              <TabsTrigger value="week" className="flex-1">Week</TabsTrigger>
              <TabsTrigger value="month" className="flex-1">Month</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 relative">
            <TabsContent value="day" className="absolute inset-0">
              <DayView events={events} onPrompt={handlePrompt} />
            </TabsContent>

            <TabsContent value="week" className="absolute inset-0">
              <WeekView events={events} onPrompt={handlePrompt} />
            </TabsContent>

            <TabsContent value="month" className="absolute inset-0">
              <MonthView events={events} onPrompt={handlePrompt} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CalendarView;