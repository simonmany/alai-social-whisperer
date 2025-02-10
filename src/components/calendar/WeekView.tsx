
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { isToday } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
}

interface WeekViewProps {
  events: CalendarEvent[];
  onPrompt: (message: string) => void;
}

const groupEventsByDayOfWeek = (events: CalendarEvent[]) => {
  // Start with Monday (1) through Sunday (0)
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days.map(day => {
    const dayEvents = events.filter(e => {
      const eventDate = new Date(e.start_time);
      const dayIndex = eventDate.getDay();
      // Convert Sunday (0) to 6 for proper indexing when starting with Monday
      const adjustedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      return days[adjustedDayIndex] === day;
    });
    return {
      day,
      events: dayEvents,
      isToday: isToday(new Date()), // This will be used to highlight the current day
    };
  });
};

export const WeekView = ({ events, onPrompt }: WeekViewProps) => {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {groupEventsByDayOfWeek(events).map(({ day, events: dayEvents, isToday }) => (
            <div key={day} className={`p-3 rounded-lg ${isToday ? 'bg-muted/30' : ''}`}>
              <h3 className="font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                {day}
                {isToday && (
                  <span className="inline-block w-2 h-2 bg-primary rounded-full" />
                )}
              </h3>
              {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events scheduled</p>
              ) : (
                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t bg-background">
        <CalendarPrompts onPrompt={onPrompt} type="week" />
      </div>
    </div>
  );
};
