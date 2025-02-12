
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";

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

export const DayView = ({ events, onPrompt }: DayViewProps) => {
  const todayEvents = filterEventsForToday(events);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {Object.entries(groupEventsByTimeOfDay(todayEvents)).map(([timeOfDay, timeEvents]) => (
            <div key={timeOfDay}>
              <h3 className="font-semibold capitalize text-muted-foreground mb-3">{timeOfDay}</h3>
              {timeEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events scheduled</p>
              ) : (
                <div className="space-y-3">
                  {timeEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t bg-background">
        <CalendarPrompts onPrompt={onPrompt} type="day" />
      </div>
    </div>
  );
};
