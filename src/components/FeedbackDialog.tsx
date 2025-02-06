
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { ContactCard } from "@/components/ContactCard";

interface Event {
  title: string;
  date: Date;
  location: string;
  attendees: Array<{
    name: string;
    image?: string;
  }>;
}

// Sample data - in a real app this would come from your calendar
const recentEvents: Event[] = [
  {
    title: "Coffee with Sarah",
    date: new Date(2024, 2, 15, 10, 30),
    location: "Blue Bottle Coffee",
    attendees: [
      { name: "Sarah", image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7" },
      { name: "John", image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b" },
    ],
  },
  {
    title: "Movie Night",
    date: new Date(2024, 2, 18, 19, 0),
    location: "AMC Theaters",
    attendees: [
      { name: "Alice", image: "https://images.unsplash.com/photo-1518770660439-4636190af475" },
      { name: "Bob", image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6" },
      { name: "Carol", image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" },
    ],
  },
];

const feedbackOptions = ["Entertaining", "Energizing", "Educational", "It Sucked!"];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

export default function FeedbackDialog({ open, onOpenChange, onSubmit }: FeedbackDialogProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [customFeedback, setCustomFeedback] = useState("");

  const formatAttendeeNames = (attendees: Array<{ name: string }>) => {
    if (attendees.length === 0) return "";
    if (attendees.length === 1) return attendees[0].name;
    if (attendees.length === 2) return `${attendees[0].name} and ${attendees[1].name}`;
    const allButLast = attendees.slice(0, -1).map(a => a.name).join(", ");
    return `${allButLast}, and ${attendees[attendees.length - 1].name}`;
  };

  const handleSubmit = () => {
    if (selectedEvent) {
      const attendeeNames = formatAttendeeNames(selectedEvent.attendees);
      const feedback = customFeedback.trim() || selectedFeedback;
      if (feedback) {
        const message = `I had a hang with ${attendeeNames} at ${selectedEvent.location} on ${selectedEvent.date.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        })} at ${selectedEvent.date.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}. We ${selectedEvent.title.toLowerCase()} and it was ${feedback.toLowerCase()}.`;
        onSubmit(message);
        onOpenChange(false);
        // Reset state
        setSelectedEvent(null);
        setSelectedFeedback(null);
        setCustomFeedback("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Which hang would you like to talk about?</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Event Selection */}
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div
                key={event.title}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedEvent === event
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-muted-foreground">
                  {event.date.toLocaleDateString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {" at "}
                  {event.date.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-sm text-muted-foreground">{event.location}</div>
              </div>
            ))}
          </div>

          {/* Attendees Section */}
          {selectedEvent && (
            <div className="space-y-2">
              <h3 className="font-medium">Attendees:</h3>
              <div className="flex gap-2">
                <TooltipProvider>
                  {selectedEvent.attendees.map((attendee) => (
                    <Drawer key={attendee.name}>
                      <TooltipTrigger asChild>
                        <DrawerTrigger asChild>
                          <button className="hover:scale-110 transition-transform">
                            <Avatar>
                              <AvatarImage src={attendee.image} alt={attendee.name} />
                              <AvatarFallback>{attendee.name[0]}</AvatarFallback>
                            </Avatar>
                          </button>
                        </DrawerTrigger>
                      </TooltipTrigger>
                      <DrawerContent className="p-4">
                        <ContactCard 
                          name={attendee.name}
                          meetingStory={`Met at ${selectedEvent.title}`}
                        />
                      </DrawerContent>
                      <TooltipContent>
                        <p>{attendee.name}</p>
                      </TooltipContent>
                    </Drawer>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Feedback Section */}
          {selectedEvent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">How was your hang?</h3>
                <div className="flex flex-wrap gap-2">
                  {feedbackOptions.map((feedback) => (
                    <Badge
                      key={feedback}
                      variant={selectedFeedback === feedback ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedFeedback(feedback);
                        setCustomFeedback("");
                      }}
                    >
                      {feedback}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Or describe it in your own words:</h3>
                <Input
                  placeholder="Type your own description..."
                  value={customFeedback}
                  onChange={(e) => {
                    setCustomFeedback(e.target.value);
                    setSelectedFeedback(null);
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          {selectedEvent && (selectedFeedback || customFeedback.trim()) && (
            <Button className="w-full" onClick={handleSubmit}>
              Submit Feedback
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
