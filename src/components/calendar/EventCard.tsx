
import { format } from "date-fns";
import { MapPin, Users } from "lucide-react";

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

export const EventCard = ({ event }: { event: CalendarEvent }) => {
  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground">
      <div className="space-y-2">
        <h3 className="font-medium">{event.title}</h3>
        
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}
        
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">
            {format(new Date(event.start_time), 'h:mm a')}
          </p>

          {event.location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{event.location}</span>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {event.attendees.map(a => a.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
