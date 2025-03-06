
import { format } from "date-fns";
import { MapPin, Users, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";
import PlanningDialog from "@/components/PlanningDialog";
import { generateChatResponse } from "@/utils/openai";
import { useToast } from "@/hooks/use-toast";
import { CalendarEvent } from "@/types/calendar";

export const EventCard = ({
  event
}: {
  event: CalendarEvent;
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);
  const {
    toast
  } = useToast();
  const eventDate = new Date(event.start_time);
  const now = new Date();
  const handleSubmit = async (message: string) => {
    try {
      await generateChatResponse(`Here's my feedback about ${event.title}: ${message}`);
      setShowFeedback(false);
    } catch (error) {
      console.error('Error sending feedback to AI:', error);
      toast({
        title: "Error",
        description: "Failed to process feedback with AI",
        variant: "destructive"
      });
    }
  };
  const handleCardClick = () => {
    if (eventDate > now) {
      setShowPlanning(true);
    } else {
      setShowFeedback(true);
    }
  };
  return (
    <>
      <div 
        onClick={handleCardClick} 
        className="p-4 border bg-card text-card-foreground relative cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden"
      >
        {event.feedback_sent !== undefined && eventDate < now && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant={event.feedback_sent ? "default" : "outline"} className="flex items-center gap-1">
              <Check className={`h-3 w-3 ${event.feedback_sent ? "" : "opacity-50"}`} />
              <span className="text-xs">Feedback</span>
            </Badge>
          </div>
        )}
        
        <div className="space-y-2 pr-16 max-w-full">
          <h3 className="font-medium truncate max-w-full">{event.title}</h3>
          
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 break-all max-w-full overflow-hidden">{event.description}</p>
          )}
          
          <div className="flex flex-col gap-1.5 max-w-full">
            <p className="text-sm text-muted-foreground">
              {event.all_day? "all day" : format(new Date(event.start_time), 'MMM d, h:mm a')}
            </p>

            {event.location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground max-w-full">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground max-w-full">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
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

      <PlanningDialog
        open={showPlanning}
        onOpenChange={setShowPlanning}
        onSubmit={() => {}}
        defaultActivity={event.title}
        defaultLocation={event.location}
        defaultDate={eventDate}
        defaultContacts={event.attendees?.map(a => ({
          id: a.id,
          name: a.name,
          email: null,
          created_at: new Date().toISOString(),
          user_id: ''
        }))}
      />
    </>
  );
};
