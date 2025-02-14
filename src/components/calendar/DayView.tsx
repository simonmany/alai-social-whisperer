
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { startOfDay, endOfDay, isWithinInterval, isPast, format } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
  location?: string;
  attendees?: Array<{
    id: string;
    name: string;
  }>;
}

interface DayViewProps {
  events: CalendarEvent[];
  onPrompt: (message: string) => void;
}

const filterEventsForToday = (events: CalendarEvent[]) => {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  return events.filter(event => {
    const eventDate = new Date(event.start_time);
    return isWithinInterval(eventDate, { start: dayStart, end: dayEnd });
  });
};

export const DayView = ({ events, onPrompt }: DayViewProps) => {
  const todayEvents = filterEventsForToday(events);
  const now = new Date();
  const day = format(now, 'EEEE (M/d)');

  return (
    <div className="flex flex-col h-full">
      <ScrollArea>
        <div className="p-4">
          <h2 className="font-medium text-lg mb-4">{day}</h2>
          <div className="space-y-3">
            {todayEvents.length === 0 ? (
              <p className="text-muted-foreground">No events scheduled</p>
            ) : (
              todayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      </ScrollArea>
      <div className="mt-auto px-4 py-3 border-t bg-background">
        <CalendarPrompts onPrompt={onPrompt} type="day" />
      </div>
    </div>
  );
};
