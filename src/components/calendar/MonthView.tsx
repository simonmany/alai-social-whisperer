
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { isFuture, isPast } from "date-fns";

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

interface MonthViewProps {
  events: CalendarEvent[];
  onPrompt: (message: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export const MonthView = ({ events, onPrompt, onEventClick }: MonthViewProps) => {
  const futureEvents = events.filter(event => isFuture(new Date(event.start_time)));
  const pastEvents = events.filter(event => isPast(new Date(event.start_time)));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4">
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
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 py-4">
          <div>
            <h3 className="font-semibold text-muted-foreground mb-3">Upcoming Events</h3>
            {futureEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {futureEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onClick={() => onEventClick?.(event)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-muted-foreground mb-3">Past Events</h3>
            {pastEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past events</p>
            ) : (
              <div className="space-y-3">
                {pastEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onClick={() => onEventClick?.(event)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t bg-background">
        <CalendarPrompts onPrompt={onPrompt} type="month" />
      </div>
    </div>
  );
};
