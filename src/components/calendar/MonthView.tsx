
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { EventCard } from "./EventCard";
import { CalendarPrompts } from "@/components/CalendarPrompts";
import { isFuture, isPast, isSameDay, isToday } from "date-fns";
import { useState } from "react";
import { CalendarEvent } from "@/types/calendar";

interface MonthViewProps {
  events: CalendarEvent[];
  onPrompt: (message: string) => void;
}

export const MonthView = ({ events, onPrompt }: MonthViewProps) => {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  const filteredEvents = selectedDay 
    ? events.filter(event => isSameDay(new Date(event.start_time), selectedDay))
    : events;

  const futureEvents = filteredEvents.filter(event => isFuture(new Date(event.start_time)));
  const pastEvents = filteredEvents.filter(event => isPast(new Date(event.start_time)));

  const handleDaySelect = (date: Date | undefined) => {
    if (date && isToday(date)) {
      // If clicking today's date, clear selection to show all events
      setSelectedDay(undefined);
    } else {
      setSelectedDay(date);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-2 py-2 w-full">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={handleDaySelect}
          className="rounded-md border w-full max-w-none mx-auto"
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
        <div className="px-2 py-2">
          {/* Upcoming Events */}
          <div className="rounded-lg mb-4">
            <h3 className="font-semibold text-muted-foreground mb-3">
              {selectedDay ? 'Events for Selected Day' : 'Upcoming Events'}
            </h3>
            {futureEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              futureEvents.map((event) => (
                <div key={event.id} className="mb-3">
                  <EventCard event={event} />
                </div>
              ))
            )}
          </div>

          {/* Past Events */}
          <div className="rounded-lg">
            <h3 className="font-semibold text-muted-foreground mb-3">Past Events</h3>
            {pastEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past events</p>
            ) : (
              pastEvents.map((event) => (
                <div key={event.id} className="mb-3">
                  <EventCard event={event} />
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="bg-background">
        <CalendarPrompts onPrompt={onPrompt} type="month" />
      </div>
    </div>
  );
};
