import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ContactCard } from "@/components/ContactCard";
import { Contact } from "@/types/contacts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, X, Archive, ArrowLeft, UserPlus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CatchUpForm } from "@/components/goals/CatchUpForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type EventAttendee = Contact;

interface Event {
  id: string;
  title: string;
  date: Date;
  location: string;
  attendees: EventAttendee[];
}

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
  selectedEventId?: string;
}

// Utility function to get initials from a name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

export default function FeedbackDialog({ open, onOpenChange, onSubmit, selectedEventId }: FeedbackDialogProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [hangDescription, setHangDescription] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [selectedContactIndex, setSelectedContactIndex] = useState<number>(-1);
  const [contactInput, setContactInput] = useState("");

  const [moodOptions] = useState([
    "fun", "chill", "deep", "productive", "nostalgic", "exciting", "meaningful"
  ]);

  // Query to fetch filtered contacts
  const { data: filteredContacts = [] } = useQuery({
    queryKey: ['filtered-contacts', contactInput],
    queryFn: async () => {
      if (!session?.user?.id || !contactInput) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .ilike('name', `%${contactInput}%`)
        .limit(5);

      if (error) throw error;
      return data.map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: !!contactInput && !!session?.user?.id
  });

  // Modified query to handle events without attendees
  const { data: eventDetails } = useQuery({
    queryKey: ['event-details', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;

      const { data: event, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          event_attendees!left (
            contacts!contact_id (
              id,
              name,
              is_archived
            )
          )
        `)
        .eq('id', selectedEventId)
        .maybeSingle();

      if (error) throw error;
      
      if (event) {
        const formattedEvent = {
          id: event.id,
          title: event.title,
          date: new Date(event.start_time),
          location: event.location || "No location specified",
          attendees: event.event_attendees
            ? event.event_attendees
                .filter((ea: any) => ea.contacts) // Filter out null attendees
                .map((ea: any) => ({
                  id: ea.contacts.id,
                  name: ea.contacts.name,
                  is_archived: ea.contacts.is_archived
                }))
            : []
        };

        if (event.description) {
          const moodMatch = event.description.match(/Mood: (.*?)\./);
          if (moodMatch) {
            setSelectedMood(moodMatch[1]);
            setHangDescription(event.description.replace(moodMatch[0], '').trim());
          } else {
            setHangDescription(event.description);
          }
        }

        return formattedEvent;
      }
      return null;
    },
    enabled: !!selectedEventId && open
  });

  // Set selectedEvent when eventDetails changes
  useEffect(() => {
    if (eventDetails) {
      setSelectedEvent(eventDetails);
      setIsManualEntry(false);
    }
  }, [eventDetails]);

  const handleContactSelect = (contact: Contact) => {
    if (selectedEvent) {
      const isAlreadyAttendee = selectedEvent.attendees.some(a => a.id === contact.id);
      if (!isAlreadyAttendee) {
        setSelectedEvent({
          ...selectedEvent,
          attendees: [...selectedEvent.attendees, contact]
        });
      }
      setContactInput("");
    }
  };

  const handleRemoveAttendee = (contactId: string) => {
    if (selectedEvent) {
      setSelectedEvent({
        ...selectedEvent,
        attendees: selectedEvent.attendees.filter(a => a.id !== contactId)
      });
    }
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) return;

    try {
      let description = hangDescription;
      if (selectedMood) {
        description = `Mood: ${selectedMood}. ${description}`;
      }

      if (selectedEvent) {
        // Update event description and feedback status
        const { error: eventError } = await supabase
          .from('calendar_events')
          .update({
            description,
            feedback_sent: true
          })
          .eq('id', selectedEvent.id);

        if (eventError) throw eventError;

        // Update event attendees
        const { error: attendeesError } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', selectedEvent.id);

        if (attendeesError) throw attendeesError;

        const newAttendees = selectedEvent.attendees.map(attendee => ({
          event_id: selectedEvent.id,
          contact_id: attendee.id
        }));

        if (newAttendees.length > 0) {
          const { error: insertError } = await supabase
            .from('event_attendees')
            .insert(newAttendees);

          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Success",
        description: "Feedback submitted successfully",
      });

      onSubmit(description);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tell me about your hang</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {(selectedEvent || selectedEventId) && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-accent/5">
                  <div className="font-medium">{selectedEvent?.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEvent?.date && format(selectedEvent.date, "EEEE, MMMM d 'at' h:mm a")}
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    {selectedEvent?.location}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Who was there:</h4>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            placeholder="Type to search contacts..."
                            value={contactInput}
                            onChange={(e) => setContactInput(e.target.value)}
                            className="h-8"
                          />
                          {contactInput && filteredContacts.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[120px] overflow-y-auto">
                              {filteredContacts
                                .filter(contact => !selectedEvent?.attendees.some(a => a.id === contact.id))
                                .map((contact) => (
                                  <div
                                    key={contact.id}
                                    className="px-2 py-1 hover:bg-accent cursor-pointer flex items-center gap-2 justify-between"
                                    onClick={() => handleContactSelect(contact)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">{contact.name}</span>
                                    </div>
                                    {contact.is_archived && (
                                      <Archive className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedEvent?.attendees.map((attendee) => (
                            <div
                              key={attendee.id}
                              className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs"
                              onClick={() => {
                                setSelectedContactIndex(selectedEvent.attendees.indexOf(attendee));
                                setIsContactDrawerOpen(true);
                              }}
                            >
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(attendee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{attendee.name}</span>
                              {attendee.is_archived && (
                                <Archive className="h-3 w-3 text-muted-foreground" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAttendee(attendee.id);
                                }}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">How was it?</h4>
                      <div className="flex flex-wrap gap-2">
                        {moodOptions.map((mood) => (
                          <button
                            key={mood}
                            onClick={() => setSelectedMood(mood)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs border transition-colors",
                              selectedMood === mood
                                ? "bg-primary text-primary-foreground border-primary"
                                : "hover:bg-accent"
                            )}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Add more details:</h4>
                      <Textarea
                        value={hangDescription}
                        onChange={(e) => setHangDescription(e.target.value)}
                        placeholder="• What did you talk about?
• How'd you feel about the activity?
• Any memorable moments?"
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(selectedEvent || (selectedEventId)) && (
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
            {selectedContactIndex >= 0 && selectedEvent?.attendees[selectedContactIndex] && (
              <ContactCard {...selectedEvent.attendees[selectedContactIndex]} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
