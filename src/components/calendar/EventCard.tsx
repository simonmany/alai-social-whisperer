
import { format } from "date-fns";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";
import PlanningDialog from "@/components/PlanningDialog";
import { generateChatResponse } from "@/utils/openai";
import { useToast } from "@/hooks/use-toast";

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
  const [showPlanning, setShowPlanning] = useState(false);
  const { toast } = useToast();
  
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
        variant: "destructive",
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
        className="bg-white rounded-lg border shadow-sm p-4 cursor-pointer hover:bg-muted/50 transition-colors relative"
        onClick={handleCardClick}
      >
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">{event.title}</h3>
            {event.feedback_sent !== undefined && eventDate < now && (
              <Badge variant="secondary" className="ml-2">
                Feedback
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {format(new Date(event.start_time), 'h:mm A')}
          </p>

          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{event.attendees.map(a => a.name).join(', ')}</span>
            </div>
          )}
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
          user_id: '',
        }))}
      />
    </>
  );
};
