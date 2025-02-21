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
import ContactsDialog from "@/components/ContactsDialog";
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
  const [description, setDescription] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState<number>(-1);
  const [contactInput, setContactInput] = useState("");
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [manualActivity, setManualActivity] = useState("");
  const [manualDate, setManualDate] = useState<Date>();
  const [manualLocation, setManualLocation] = useState("");
  const [manualTime, setManualTime] = useState<string>("");
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false);

  const [moodOptions] = useState([
    "fun", "chill", "deep", "productive", "nostalgic", "exciting", "meaningful"
  ]);

  const timeOptions = ["morning", "afternoon", "evening", "night"];

  const openContactDrawer = (index: number) => {
    setSelectedContactIndex(index);
    setIsContactDrawerOpen(true);
  };

  const { data: eventDetails } = useQuery({
    queryKey: ['event-details', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;

      const { data: event, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          start_time,
          location,
          description,
          event_attendees (
            contacts (
              id,
              name,
              is_archived
            )
          )
        `)
        .eq('id', selectedEventId)
        .single();

      if (error) throw error;
      
      if (event) {
        const formattedEvent = {
          id: event.id,
          title: event.title,
          date: new Date(event.start_time),
          location: event.location || "No location specified",
          attendees: event.event_attendees.map((ea: any) => ({
            id: ea.contacts.id,
            name: ea.contacts.name
          }))
        };

        if (event.description) {
          const moodMatch = event.description.match(/Mood: (.*?)\./);
          if (moodMatch) {
            setSelectedMood(moodMatch[1]);
            setDescription(event.description.replace(moodMatch[0], '').trim());
          } else {
            setDescription(event.description);
          }
        }

        return formattedEvent;
      }
      return null;
    },
    enabled: !!selectedEventId && open
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['recent-events-without-feedback'],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const now = new Date();

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          start_time,
          location,
          feedback_sent,
          event_attendees (
            contacts (
              id,
              name,
              is_archived
            )
          )
        `)
        .eq('user_id', session.user.id)
        .eq('feedback_sent', false)
        .gte('start_time', thirtyDaysAgo.toISOString())
        .lte('start_time', now.toISOString())
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent events:', error);
        return [];
      }

      return data.map(event => ({
        id: event.id,
        title: event.title,
        date: new Date(event.start_time),
        location: event.location || "No location specified",
        attendees: event.event_attendees.map((ea: any) => ({
          id: ea.contacts.id,
          name: ea.contacts.name
        }))
      }));
    },
    enabled: open && !selectedEventId
  });

  const { data: filteredContacts = [] } = useQuery({
    queryKey: ['filtered-contacts', contactInput],
    queryFn: async () => {
      if (!session?.user?.id || !contactInput) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .ilike('name', `%${contactInput}%`)
        .order('name');

      if (error) throw error;
      return data.map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: !!contactInput && !!session?.user?.id
  });

  const { data: activitySuggestions = [] } = useQuery({
    queryKey: ['activity-suggestions', manualActivity],
    queryFn: async () => {
      if (!manualActivity) return [];

      const { data, error } = await supabase
        .from('activities')
        .select('name, category')
        .ilike('name', `%${manualActivity}%`)
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!manualActivity && isManualEntry
  });

  useEffect(() => {
    if (eventDetails) {
      setSelectedEvent(eventDetails);
      setIsManualEntry(false);
    }
  }, [eventDetails]);

  useEffect(() => {
    if (!open) {
      setShowNewContactDialog(false);
    }
  }, [open]);

  const handleBackClick = () => {
    if (!selectedEventId) {
      setSelectedEvent(null);
      setDescription("");
      setSelectedMood("");
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
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

  const generateMessage = () => {
    const hasDescription = description.trim() !== "";
    const hasMood = selectedMood !== "";
    const hasContacts = selectedContacts.length > 0;
    const hasEvent = selectedEvent !== null;
    const hasActivity = manualActivity.trim() !== "";

    const formatContacts = (contacts: Contact[]) => {
      if (contacts.length === 0) return "";
      if (contacts.length === 1) return contacts[0].name;
      if (contacts.length === 2) return `${contacts[0].name} and ${contacts[1].name}`;
      const allButLast = contacts.slice(0, -1).map(c => c.name).join(", ");
      return `${allButLast}, and ${contacts[contacts.length - 1].name}`;
    };

    if (hasEvent) {
      const eventDate = format(selectedEvent.date, 'MMMM do');
      const baseContext = `About our ${selectedEvent.title.toLowerCase()} on ${eventDate}`;
      
      if (!hasDescription && !hasMood) {
        return `${baseContext} - I want to share how it went.`;
      }

      const moodPhrase = hasMood ? ` It was ${selectedMood}` : "";
      const descriptionPhrase = hasDescription ? ` ${description}` : "";
      
      return `${baseContext} -${moodPhrase}.${descriptionPhrase}`;
    }

    if (!hasDescription && !hasMood && !hasContacts && !hasActivity) {
      return "I want to share feedback about a recent hangout!";
    }

    const activityPhrase = hasActivity ? `${manualActivity}` : "hung out";
    const contactPhrase = hasContacts ? ` with ${formatContacts(selectedContacts)}` : "";
    const moodPhrase = hasMood ? ` It was ${selectedMood}` : "";
    const descriptionPhrase = hasDescription ? ` ${description}` : "";

    if (!hasDescription && hasMood && hasContacts) {
      return `I had a ${selectedMood} time ${contactPhrase} ${hasActivity ? `at ${activityPhrase}` : ""}!`;
    }

    if (hasDescription && !hasMood && !hasContacts) {
      return `Here's what happened at ${activityPhrase}: ${description}`;
    }

    return `I ${activityPhrase}${contactPhrase}.${moodPhrase}.${descriptionPhrase}`;
  };

  const handleSubmit = async () => {
    const message = generateMessage();
    if (!session?.user?.id) return;

    try {
      let eventDescription = description;
      if (selectedMood) {
        eventDescription = `Mood: ${selectedMood}. ${description}`;
      }

      if (selectedEvent) {
        const { error: eventError } = await supabase
          .from('calendar_events')
          .update({
            description: eventDescription,
            feedback_sent: true
          })
          .eq('id', selectedEvent.id);

        if (eventError) throw eventError;

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
      } else if (isManualEntry) {
        const { data: event, error: eventError } = await supabase
          .from('calendar_events')
          .insert({
            title: manualActivity,
            description: eventDescription,
            start_time: manualDate?.toISOString() || new Date().toISOString(),
            end_time: manualDate?.toISOString() || new Date().toISOString(),
            location: manualLocation,
            user_id: session.user.id,
            feedback_sent: true
          })
          .select()
          .single();

        if (eventError) throw eventError;

        if (selectedContacts.length > 0 && event) {
          const newAttendees = selectedContacts.map(contact => ({
            event_id: event.id,
            contact_id: contact.id
          }));

          const { error: attendeesError } = await supabase
            .from('event_attendees')
            .insert(newAttendees);

          if (attendeesError) throw attendeesError;
        }
      }

      setDescription("");
      setSelectedMood("");
      setManualActivity("");
      setSelectedContacts([]);
      setContactInput("");
      setSelectedEvent(null);
      setIsManualEntry(false);
      setManualDate(undefined);
      setManualLocation("");
      setManualTime("");
      setShowActivitySuggestions(false);

      toast({
        title: "Success!",
        description: "Feedback submitted successfully",
      });

      onSubmit(message);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewContactSubmit = (message: string, contact: Contact) => {
    if (selectedEvent) {
      setSelectedEvent({
        ...selectedEvent,
        attendees: [...selectedEvent.attendees, contact]
      });
    } else {
      setSelectedContacts(prev => [...prev, contact]);
    }
    setShowNewContactDialog(false);
    setContactInput("");
    toast({
      description: "Contact added and included in the event!"
    });
  };

  const renderContactSearch = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Input
          placeholder="Type to search contacts..."
          value={contactInput}
          onChange={(e) => setContactInput(e.target.value)}
          className="h-8 flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            setShowNewContactDialog(true);
          }}
          className="h-8 px-2 text-sm"
        >
          <UserPlus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

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

      {showNewContactDialog && session?.user?.id && (
        <ContactsDialog
          open={showNewContactDialog}
          onOpenChange={setShowNewContactDialog}
          onSubmit={handleNewContactSubmit}
          userId={session.user.id}
        />
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tell me about your hang</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {!selectedEventId && (
              <div className="flex gap-2">
                <Button
                  variant={!isManualEntry ? "default" : "outline"}
                  onClick={() => setIsManualEntry(false)}
                  className="flex-1"
                >
                  Recent Calendar Events
                </Button>
                <Button
                  variant={isManualEntry ? "default" : "outline"}
                  onClick={() => setIsManualEntry(true)}
                  className="flex-1"
                >
                  Something off the books
                </Button>
              </div>
            )}

            {!isManualEntry && (
              <div className="space-y-4">
                {!selectedEventId && !selectedEvent && (
                  <div className="space-y-2">
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-lg border cursor-pointer hover:bg-accent"
                        onClick={() => handleEventSelect(event)}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(event.date, "EEEE, MMMM d 'at' h:mm a")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.location}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(selectedEvent || selectedEventId) && (
                  <>
                    {!selectedEventId && (
                      <Button
                        variant="ghost"
                        onClick={handleBackClick}
                        className="flex items-center gap-1.5 mb-4 h-8 px-2 -ml-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to events
                      </Button>
                    )}

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
                              {renderContactSearch()}
                            </div>

                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedEvent?.attendees.map((attendee) => (
                                <div
                                  key={attendee.id}
                                  className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs"
                                  onClick={() => openContactDrawer(selectedEvent.attendees.indexOf(attendee))}
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
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="• What did you talk about?
• How'd you feel about the activity?
• Any memorable moments?"
                            className="min-h-[100px]"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {isManualEntry && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Who was there?</h4>
                  {renderContactSearch()}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedContacts.map((contact, index) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-[11px] hover:bg-secondary/80 cursor-pointer max-w-[150px]"
                        onClick={() => {
                          setSelectedContactIndex(index);
                          setIsContactDrawerOpen(true);
                        }}
                      >
                        <Avatar className="h-4 w-4 shrink-0">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{contact.name}</span>
                        {contact.is_archived && (
                          <Archive className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContacts(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">What did you do?</h4>
                  <div className="relative">
                    <Input
                      value={manualActivity}
                      onChange={(e) => setManualActivity(e.target.value)}
                      onFocus={() => setShowActivitySuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowActivitySuggestions(false), 200);
                      }}
                      placeholder="e.g., Coffee chat, Dinner, Hiking..."
                    />
                    {showActivitySuggestions && activitySuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                        {activitySuggestions.map((activity, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="w-full justify-start text-sm h-9"
                            onClick={() => {
                              setManualActivity(activity.name);
                              setShowActivitySuggestions(false);
                            }}
                          >
                            <span>{activity.name}</span>
                            {activity.category && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({activity.category})
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Where was it?</h4>
                  <Input
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="Enter location..."
                  />
                </div>

                <div className="grid gap-2">
                  <h4 className="text-sm font-medium">When was it?</h4>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-8 text-sm flex-1",
                            !manualDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {manualDate ? format(manualDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0" 
                        align="start" 
                        side="bottom"
                      >
                        <Calendar
                          mode="single"
                          selected={manualDate}
                          onSelect={setManualDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Select value={manualTime} onValueChange={setManualTime}>
                      <SelectTrigger className="h-8 text-sm w-[130px]">
                        <SelectValue placeholder="Pick a time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time} className="text-sm">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="• What did you talk about?
• How'd you feel about the activity?
• Any memorable moments?"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {(selectedEvent || (isManualEntry && manualActivity)) && (
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
            {selectedContactIndex >= 0 && selectedContacts[selectedContactIndex] && (
              <ContactCard {...selectedContacts[selectedContactIndex]} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
