
import { format } from "date-fns";
import { MapPin, Users, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";

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

export const EventCard = ({ event }: { event: CalendarEvent }) => {
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSubmit = (message: string) => {
    // This will be handled by FeedbackDialog internally now
    setShowFeedback(false);
  };

  return (
    <>
      <div 
        className="p-4 rounded-lg border bg-card text-card-foreground relative cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setShowFeedback(true)}
      >
        {event.feedback_sent !== undefined && (
          <div className="absolute top-2 right-2">
            <Badge variant={event.feedback_sent ? "default" : "outline"} className="flex items-center gap-1">
              <Check className={`h-3 w-3 ${event.feedback_sent ? "" : "opacity-50"}`} />
              <span className="text-xs">Feedback</span>
            </Badge>
          </div>
        )}
        
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

      <FeedbackDialog
        open={showFeedback}
        onOpenChange={setShowFeedback}
        onSubmit={handleSubmit}
        selectedEventId={event.id}
      />
    </>
  );
};
