
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
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ContactCard } from "@/components/ContactCard";
import { Contact } from "@/types/contacts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface Event {
  id: string;
  title: string;
  date: Date;
  location: string;
  attendees: Contact[];
}

const feedbackOptions = ["Entertaining", "Energizing", "Educational", "It Sucked!"];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

export default function FeedbackDialog({ open, onOpenChange, onSubmit }: FeedbackDialogProps) {
  const { session } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [customFeedback, setCustomFeedback] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events-with-attendees'],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data: calendarEvents, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .lte('start_time', new Date().toISOString())
        .order('start_time', { ascending: false });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
      }

      const eventsWithAttendees = await Promise.all(
        calendarEvents.map(async (event) => {
          const { data: attendeeLinks, error: attendeesError } = await supabase
            .from('event_attendees')
            .select('contact_id')
            .eq('event_id', event.id);

          if (attendeesError) {
            console.error('Error fetching attendees:', attendeesError);
            return null;
          }

          const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('*')
            .in('id', attendeeLinks.map(link => link.contact_id));

          if (contactsError) {
            console.error('Error fetching contacts:', contactsError);
            return null;
          }

          return {
            id: event.id,
            title: event.title,
            date: new Date(event.start_time),
            location: event.description || "No location specified",
            attendees: contacts
          };
        })
      );

      return eventsWithAttendees.filter((event): event is Event => event !== null);
    },
    enabled: !!session?.user?.id
  });

  const formatAttendeeNames = (attendees: Contact[]) => {
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
        setSelectedContact(null);
      }
    }
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactDrawerOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Which hang would you like to talk about?</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Event Selection */}
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedEvent?.id === event.id
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
                      <Tooltip key={attendee.id}>
                        <TooltipTrigger asChild>
                          <button 
                            className="hover:scale-110 transition-transform"
                            onClick={() => handleContactClick(attendee)}
                          >
                            <Avatar>
                              <AvatarFallback>{attendee.name[0]}</AvatarFallback>
                            </Avatar>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{attendee.name}</p>
                        </TooltipContent>
                      </Tooltip>
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

      <Drawer open={isContactDrawerOpen} onOpenChange={setIsContactDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm p-4">
            {selectedContact && (
              <ContactCard {...selectedContact} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
