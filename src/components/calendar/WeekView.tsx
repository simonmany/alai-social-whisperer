
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { isToday, startOfWeek, addDays, format, isSameDay, isPast } from "date-fns";
import { CalendarEvent } from "@/types/calendar";

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
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.start_time), date)
    );

    // Split events into past and future
    const now = new Date();
    const pastEvents = dayEvents.filter(e => isPast(new Date(e.start_time)));
    const futureEvents = dayEvents.filter(e => !isPast(new Date(e.start_time)));

    return {
      date,
      dayName: format(date, 'EEEE'), // Full day name
      pastEvents,
      futureEvents,
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
          {groupEventsByDayOfWeek(events).map(({ date, dayName, pastEvents, futureEvents, isToday }) => (
            <div key={dayName} className={`p-3 rounded-lg ${isToday ? 'bg-muted/30' : ''}`}>
              <h3 className="font-semibold text-muted-foreground mb-3">
                {dayName} ({format(date, 'M/d')})
              </h3>
              
              {/* Past Events */}
              {pastEvents.length > 0 && (
                <div className="space-y-3 mb-3">
                  {pastEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {/* Divider Line (only shown for today) */}
              {isToday && (
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#8E9196]"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-sm text-muted-foreground">
                      Now
                    </span>
                  </div>
                </div>
              )}

              {/* Future Events */}
              {futureEvents.length > 0 ? (
                <div className="space-y-3">
                  {futureEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : pastEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">No events scheduled</p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="bg-background">
        <CalendarPrompts onPrompt={onPrompt} type="week" />
      </div>
    </div>
  );
};
