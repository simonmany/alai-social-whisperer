import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";

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
    queryKey: ["calendar-events"],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      try {
        // 1) Check if we have google_access_token
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("google_access_token, google_token_expires_at")
          .eq("id", session.user.id)
          .single();
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          return [];
        }

        // 2) If token found, sync with Google
        if (profile?.google_access_token) {
          const now = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(now.getDate() + 30);

          // Call the calendar edge function to sync events
          const { data: syncResponse, error: syncError } = await supabase.functions.invoke("calendar", {
            body: {
              action: "list",
              timeMin: now.toISOString(),
              timeMax: thirtyDaysFromNow.toISOString(),
            },
          });
          if (syncError) {
            console.error("Error syncing with Google Calendar:", syncError);
            toast({
              title: "Error syncing calendar",
              description: "Failed to sync with Google Calendar. Please try again.",
              variant: "destructive",
            });
          } else {
            console.log("Successfully synced with Google Calendar", syncResponse);
          }
        }

        // 3) Fetch events from local DB
        const { data: dbEvents, error } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", session.user.id)
          // Show next 30 days
          .gte("start_time", new Date().toISOString())
          .lte("start_time", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
          .order("start_time", { ascending: true });

        if (error) {
          console.error("Error fetching calendar events:", error);
          toast({
            title: "Error",
            description: "Failed to fetch calendar events.",
            variant: "destructive",
          });
          return [];
        }

        return dbEvents || [];
      } catch (error) {
        console.error("Exception in fetchCalendarEvents:", error);
        toast({
          title: "Error",
          description: "Failed to fetch calendar events. Check console.",
          variant: "destructive",
        });
        return [];
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
          <h2 className="text-lg font-semibold">Calendar</h2>
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
