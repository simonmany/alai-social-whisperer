import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
}

interface MonthViewProps {
  events: CalendarEvent[];
  onPrompt: (message: string) => void;
}

export const MonthView = ({ events, onPrompt }: MonthViewProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4">
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
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          <h3 className="font-semibold text-muted-foreground">Upcoming Events</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </ScrollArea>
      <CalendarPrompts onPrompt={onPrompt} type="month" />
    </div>
  );
};