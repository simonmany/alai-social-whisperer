
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { startOfDay, endOfDay, isWithinInterval, isPast } from "date-fns";

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
  const now = new Date();
  const pastEvents = events.filter(e => isPast(new Date(e.start_time)));
  const futureEvents = events.filter(e => !isPast(new Date(e.start_time)));

  return {
    past: pastEvents,
    future: futureEvents
  };
};

export const DayView = ({ events, onPrompt }: DayViewProps) => {
  const todayEvents = filterEventsForToday(events);
  const { past, future } = groupEventsByTimeOfDay(todayEvents);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {/* Past Events */}
          <div>
            <h3 className="font-semibold text-muted-foreground mb-3">Past</h3>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past events</p>
            ) : (
              <div className="space-y-3">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>

          {/* Divider Line */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#8E9196]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-sm text-muted-foreground">
                Now
              </span>
            </div>
          </div>

          {/* Future Events */}
          <div>
            <h3 className="font-semibold text-muted-foreground mb-3">Upcoming</h3>
            {future.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {future.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t bg-background">
        <CalendarPrompts onPrompt={onPrompt} type="day" />
      </div>
    </div>
  );
};
