
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { isToday, startOfWeek, addDays, format, isSameDay } from "date-fns";

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

interface WeekViewProps {
  events: CalendarEvent[];
  onPrompt: (message: string) => void;
}

const groupEventsByDayOfWeek = (events: CalendarEvent[]) => {
  // Get the start of the current week (Monday)
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  // Generate array of dates for the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    return {
      date,
      dayName: format(date, 'EEEE'), // Full day name
      events: events.filter(event => 
        isSameDay(new Date(event.start_time), date)
      ),
      isToday: isToday(date)
    };
  });

  return weekDays;
};

export const WeekView = ({ events, onPrompt }: WeekViewProps) => {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {groupEventsByDayOfWeek(events).map(({ date, dayName, events: dayEvents, isToday }) => (
            <div key={dayName} className={`p-3 rounded-lg ${isToday ? 'bg-muted/30' : ''}`}>
              <h3 className="font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                {dayName} ({format(date, 'M/d')})
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
