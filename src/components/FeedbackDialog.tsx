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
import { generateChatResponse } from "@/utils/openai";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [moodOptions] = useState([
    "fun", "chill", "deep", "productive", "nostalgic", "exciting", "meaningful"
  ]);

  // Query to fetch past events needing feedback
  const { data: pastEvents = [] } = useQuery({
    queryKey: ['past-events-needing-feedback'],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
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
        .eq('user_id', session.user.id)
        .eq('feedback_sent', false)
        .lt('end_time', new Date().toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;

      return data.map(event => ({
        id: event.id,
        title: event.title,
        date: new Date(event.start_time),
        location: event.location || "No location specified",
        attendees: event.event_attendees
          ? event.event_attendees
              .filter((ea: any) => ea.contacts)
              .map((ea: any) => ({
                id: ea.contacts.id,
                name: ea.contacts.name,
                is_archived: ea.contacts.is_archived
              }))
          : []
      }));
    },
    enabled: open && !selectedEventId
  });

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

  // Query to fetch event details
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

  useEffect(() => {
    if (eventDetails) {
      setSelectedEvent(eventDetails);
      setIsManualEntry(false);
    }
  }, [eventDetails]);

  const handleSelectPastEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsManualEntry(false);
    setHangDescription("");
    setSelectedMood("");
  };

  const handleStartManualEntry = () => {
    setIsManualEntry(true);
    setSelectedEvent({
      id: crypto.randomUUID(),
      title: "Manual Entry",
      date: selectedDate,
      location: "",
      attendees: []
    });
  };

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
        if (isManualEntry) {
          // Create new event for manual entry
          const { data: newEvent, error: createError } = await supabase
            .from('calendar_events')
            .insert({
              user_id: session.user.id,
              title: "Manual Hang",
              start_time: selectedDate,
              end_time: selectedDate,
              description,
              location: selectedEvent.location,
              feedback_sent: true
            })
            .select()
            .single();

          if (createError) throw createError;

          // Insert attendees for manual entry
          if (selectedEvent.attendees.length > 0) {
            const newAttendees = selectedEvent.attendees.map(attendee => ({
              event_id: newEvent.id,
              contact_id: attendee.id
            }));

            const { error: attendeesError } = await supabase
              .from('event_attendees')
              .insert(newAttendees);

            if (attendeesError) throw attendeesError;
          }
        } else {
          // Update existing event
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

        // Send feedback to AI through chat
        const feedbackMessage = `I just had a ${selectedMood || 'great'} hang with ${selectedEvent.attendees.map(a => a.name).join(', ')} at ${selectedEvent.location || 'somewhere'}. ${description}`;
        
        const aiResponse = await generateChatResponse(feedbackMessage, selectedEvent.attendees[0]);

        toast({
          title: "Success",
          description: "Feedback submitted successfully",
        });

        onSubmit(description);
        onOpenChange(false);
      }
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
            {!selectedEvent && !selectedEventId && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent hangs needing feedback:</h4>
                  {pastEvents.length > 0 ? (
                    <div className="space-y-2">
                      {pastEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleSelectPastEvent(event)}
                          className="w-full p-3 text-left border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(event.date, "EEEE, MMMM d 'at' h:mm a")}
                          </div>
                          {event.attendees.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {event.attendees.map((attendee) => (
                                <div
                                  key={attendee.id}
                                  className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs"
                                >
                                  <Avatar className="h-4 w-4">
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(attendee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{attendee.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent events found needing feedback.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Or add something off the books:</h4>
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="grid gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium mb-1.5">When did you hang?</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => date && setSelectedDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={handleStartManualEntry}
                    >
                      Add Manual Entry
                    </Button>
                  </div>
                </div>
              </div>
            )}

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

            {(selectedEvent || selectedEventId) && (
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
