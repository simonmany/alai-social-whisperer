
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsUp, RefreshCw } from "lucide-react";
import { generateChatResponse, ContactInfo, ConversationType } from "@/utils/openai";
import { format, parse, isValid } from "date-fns";

interface AIResponse {
  text?: string;
  contacts?: string[];
  activity?: string;
  datetime?: {
    date: string;
    time: string;
  };
}

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  contactInfo?: ContactInfo[];
  onSuggestionReceived: (suggestion: AIResponse) => void;
}

export function SuggestionDialog({
  open,
  onOpenChange,
  title,
  message,
  contactInfo,
  onSuggestionReceived,
}: SuggestionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<AIResponse | null>(null);

  const fetchSuggestion = async () => {
    try {
      setIsLoading(true);
      const data = await generateChatResponse(message, contactInfo, true, ConversationType.HANG_PLANNER);

      if (data.response) {
        setCurrentResponse(data.response);
      } else {
        throw new Error("No response received");
      }
    } catch (error) {
      console.error("Error getting suggestion:", error);
      setCurrentResponse({
        text: "Sorry, I couldn't generate a suggestion at this time. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPlan = () => {
    if (currentResponse) {
      onSuggestionReceived(currentResponse);
      onOpenChange(false);
    }
  };

  const handleRegeneratePlan = () => {
    setCurrentResponse(null);
    fetchSuggestion();
  };

  // Start fetching as soon as dialog opens
  if (open && !isLoading && !currentResponse) {
    fetchSuggestion();
  }

  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      // First, ensure we have a valid date string
      const date = new Date(dateStr);
      if (!isValid(date)) {
        console.error("Invalid date:", dateStr);
        return "Invalid date";
      }

      // Parse the time string (assuming it's in 12-hour format)
      const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) {
        console.error("Invalid time format:", timeStr);
        return format(date, 'EEE, MMM d');
      }

      // Create a date object with both date and time
      const formattedDate = parse(
        `${format(date, 'yyyy-MM-dd')} ${timeStr}`,
        'yyyy-MM-dd hh:mm a',
        new Date()
      );

      if (!isValid(formattedDate)) {
        console.error("Invalid datetime combination:", dateStr, timeStr);
        return format(date, 'EEE, MMM d');
      }

      return `${format(date, 'EEE, MMM d')} at ${timeStr}`;
    } catch (error) {
      console.error("Error formatting date/time:", error);
      return "Invalid date/time";
    }
  };

  const renderResponse = (response: AIResponse) => {
    if (!response) return null;
    if (Array.isArray(response.contacts) && response.contacts.length > 0 && typeof response.contacts[0] === 'object') {
      console.log('Contacts', response.contacts)
      response.contacts = response.contacts.map(contact => contact.name);
    }

    return (
      <div className="space-y-4 text-sm">
        {response.text && response.text.split('\n').map((line, i) => (
          <p key={`line-${i}`}>{line}</p>
        ))}
        
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h3 className="font-medium">Suggested Plan:</h3>
          {response.contacts && response.contacts.length > 0 && (
            <div>
              <p className="font-semibold">Suggested Attendees:</p>
              <p>
                {response.contacts.join(', ')}
              </p>
            </div>
          )}
          {response.activity && (
            <div>
              <span className="font-medium">What: </span>
              {response.activity}
            </div>
          )}
          {response.datetime && (
            <div>
              <span className="font-medium">When: </span>
              {formatDateTime(response.datetime.date, response.datetime.time)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : currentResponse ? (
            renderResponse(currentResponse)
          ) : null}
        </div>

        {currentResponse && !isLoading && (
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleRegeneratePlan}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Suggest a different plan
            </Button>
            <Button
              onClick={handleAcceptPlan}
              className="gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Accept plan
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
