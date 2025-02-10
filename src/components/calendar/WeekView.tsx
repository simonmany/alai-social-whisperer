
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface WeekViewProps {
  events: CalendarEvent[];
  onPrompt: (message: string) => void;
}

const groupEventsByDayOfWeek = (events: CalendarEvent[]) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.map(day => ({
    day,
    events: events.filter(e => days[new Date(e.start_time).getDay()] === day),
  }));
};

export const WeekView = ({ events, onPrompt }: WeekViewProps) => {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {groupEventsByDayOfWeek(events).map(({ day, events: dayEvents }) => (
            <div key={day}>
              <h3 className="font-semibold text-muted-foreground mb-3">{day}</h3>
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
