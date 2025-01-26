import { format } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
}

export const EventCard = ({ event }: { event: CalendarEvent }) => {
  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground">
      <h3 className="font-medium">{event.title}</h3>
      {event.description && (
        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
      )}
      <p className="text-sm text-muted-foreground">
        {format(new Date(event.start_time), 'h:mm a')}
      </p>
    </div>
  );
};