import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

const sampleEvents = [
  {
    title: "Coffee with Sarah",
    date: new Date(2024, 2, 15, 10, 30),
    type: "social",
  },
  {
    title: "Movie Night",
    date: new Date(2024, 2, 18, 19, 0),
    type: "entertainment",
  },
  {
    title: "Dinner Party",
    date: new Date(2024, 2, 20, 20, 0),
    type: "social",
  },
];

const CalendarView = () => {
  const navigate = useNavigate();

  return (
    <Sheet open={true}>
      <SheetContent
        side="left"
        className="w-full sm:w-[540px] p-0"
        onPointerDownOutside={() => navigate("/")}
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
              <div className="space-y-4">
                {sampleEvents.map((event, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card text-card-foreground"
                  >
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="week" className="flex-1 p-4">
              <div className="space-y-4">
                {sampleEvents.map((event, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card text-card-foreground"
                  >
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.date.toLocaleDateString([], {
                        weekday: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="month" className="flex-1 p-4">
              <Calendar
                mode="single"
                selected={new Date()}
                className="rounded-md border"
              />
              <div className="mt-4 space-y-4">
                {sampleEvents.map((event, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card text-card-foreground"
                  >
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.date.toLocaleDateString([], {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CalendarView;