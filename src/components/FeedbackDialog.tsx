import { useState } from "react";
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
import { CalendarIcon, X, Archive, Bot } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast, toast } from "@/hooks/use-toast";
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

const timeOptions = ["morning", "afternoon", "evening"];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

export default function FeedbackDialog({ open, onOpenChange, onSubmit }: FeedbackDialogProps) {
  const { session } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [manualAttendees, setManualAttendees] = useState<string[]>([]);
  const [contactSearchInput, setContactSearchInput] = useState("");
  const [manualActivity, setManualActivity] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualDate, setManualDate] = useState<Date | undefined>(new Date());
  const [manualTime, setManualTime] = useState<string>("afternoon");
  const [manualNotes, setManualNotes] = useState("");
  const [hangDescription, setHangDescription] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");

  const moodOptions = [
    "fun",
    "chill",
    "deep",
    "productive",
    "nostalgic",
    "exciting",
    "meaningful"
  ];

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', contactSearchInput],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .ilike('name', `%${contactSearchInput}%`)
        .order('name');

      if (error) throw error;
      
      return (data || []).map(contact => ({
        ...contact,
        food_interests: Array.isArray(contact.food_interests) ? contact.food_interests : [],
        recreation_interests: Array.isArray(contact.recreation_interests) ? contact.recreation_interests : [],
        arts_interests: Array.isArray(contact.arts_interests) ? contact.arts_interests : []
      })) as Contact[];
    },
    enabled: !!session?.user?.id && contactSearchInput.length > 0
  });

  const filteredContacts = contacts.filter(contact => 
    !manualAttendees.includes(contact.id)
  );

  const addContact = (contact: Contact) => {
    if (!manualAttendees.includes(contact.id)) {
      setManualAttendees(prev => [...prev, contact.id]);
    }
    setContactSearchInput("");
  };

  const removeContact = (contactId: string) => {
    setManualAttendees(prev => prev.filter(id => id !== contactId));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called - starting submission process');

    if (isManualEntry) {
      console.log('Manual entry mode detected');
      
      if (!manualDate || !manualActivity || manualAttendees.length === 0) {
        console.log('Validation failed:', { manualDate, manualActivity, attendeesCount: manualAttendees.length });
        return;
      }

      const eventDate = new Date(manualDate);
      const startHour = manualTime === 'morning' ? 9 : manualTime === 'afternoon' ? 14 : 19;
      const endHour = startHour + 1;

      const startTime = new Date(eventDate.setHours(startHour, 0, 0, 0));
      const endTime = new Date(eventDate.setHours(endHour, 0, 0, 0));

      console.log('Submitting manual event:', {
        activity: manualActivity,
        location: manualLocation,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendees: manualAttendees,
        userId: session?.user?.id
      });

      try {
        if (!session?.user?.id) {
          console.error('No user session found');
          return;
        }

        const { data: newEvent, error: eventError } = await supabase
          .from('calendar_events')
          .insert({
            title: manualActivity,
            description: manualLocation,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            user_id: session.user.id,
            feedback_sent: true
          })
          .select()
          .single();

        if (eventError) {
          console.error('Error creating event:', eventError);
          return;
        }

        console.log('Successfully created event:', newEvent);

        const attendeePromises = manualAttendees.map(async contactId => {
          const { data, error } = await supabase
            .from('event_attendees')
            .insert({
              event_id: newEvent.id,
              contact_id: contactId
            })
            .select();
          
          if (error) {
            console.error(`Error inserting attendee ${contactId}:`, error);
          }
          return { contactId, data, error };
        });

        const attendeeResults = await Promise.all(attendeePromises);
        console.log('Attendee insertion results:', attendeeResults);

        const attendeeNames = contacts
          .filter(contact => manualAttendees.includes(contact.id))
          .map(contact => contact.name)
          .join(', ');

        const message = `I had a hang with ${attendeeNames} at ${manualLocation} on ${format(manualDate, 'EEEE, MMMM d')} in the ${manualTime}. We ${manualActivity.toLowerCase()}. ${manualNotes}`;
        console.log('Submitting message:', message);
        onSubmit(message);
      } catch (error) {
        console.error('Error in event submission process:', error);
      }
    } else if (selectedEvent) {
      console.log('Selected existing event:', selectedEvent);
      const attendeeNames = formatAttendeeNames(selectedEvent.attendees);
      let message = `I had a ${selectedMood ? selectedMood + " " : ""}hang with ${attendeeNames} at ${selectedEvent.location} on ${format(new Date(selectedEvent.date), "EEEE, MMMM d")} at ${format(new Date(selectedEvent.date), "h:mm a")}. We ${selectedEvent.title.toLowerCase()}.`;

      if (hangDescription) {
        message += ` ${hangDescription}`;
      }

      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({ feedback_sent: true })
        .eq('id', selectedEvent.id);

      if (updateError) {
        console.error('Error updating feedback status:', updateError);
        toast({
          title: "Error",
          description: "Failed to update feedback status.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Submitting existing event message:', message);
      onSubmit(message);
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setSelectedContact(null);
    setIsManualEntry(false);
    setManualAttendees([]);
    setManualActivity("");
    setManualLocation("");
    setManualDate(new Date());
    setManualTime("afternoon");
    setManualNotes("");
    setContactSearchInput("");
    setHangDescription("");
    setSelectedMood("");
  };

  const formatAttendeeNames = (attendees: EventAttendee[]) => {
    if (attendees.length === 0) return "";
    if (attendees.length === 1) return attendees[0].name;
    if (attendees.length === 2) return `${attendees[0].name} and ${attendees[1].name}`;
    const allButLast = attendees.slice(0, -1).map(a => a.name).join(", ");
    return `${allButLast}, and ${attendees[attendees.length - 1].name}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tell me about your hang</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
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

            {!isManualEntry ? (
              <div className="space-y-4">
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

                {selectedEvent && (
                  <div className="space-y-4 mt-4 p-4 border rounded-lg bg-accent/5">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Who was there:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.attendees.map((attendee) => (
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
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Who was there?</label>
                  <div className="space-y-2 relative">
                    <Input
                      placeholder="Search contacts..."
                      value={contactSearchInput}
                      onChange={(e) => setContactSearchInput(e.target.value)}
                      className="h-8"
                    />
                    
                    {contactSearchInput && filteredContacts.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-[120px] overflow-y-auto">
                        {filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer border-b last:border-b-0 justify-between bg-popover"
                            onClick={() => addContact(contact)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{getInitials(contact.name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-popover-foreground">{contact.name}</span>
                            </div>
                            {contact.is_archived && (
                              <Archive className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {manualAttendees.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {manualAttendees.map((attendeeId) => {
                          const contact = contacts.find(c => c.id === attendeeId);
                          if (!contact) return null;
                          return (
                            <div
                              key={contact.id}
                              className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs"
                            >
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[10px]">{getInitials(contact.name)}</AvatarFallback>
                              </Avatar>
                              <span>{contact.name}</span>
                              {contact.is_archived && (
                                <Archive className="h-3 w-3 text-muted-foreground" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeContact(contact.id);
                                }}
                                className="hover:text-destructive ml-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">What did you do?</label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Type an activity..."
                      value={manualActivity}
                      onChange={(e) => {
                        setManualActivity(e.target.value);
                      }}
                      className="h-8"
                    />
                    
                    {manualActivity && filteredActivities.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        {filteredActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setManualActivity(activity.name);
                            }}
                          >
                            <span className="text-sm">{activity.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Where did you go?</label>
                  <Input
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="Enter location..."
                    className="h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">When did you hang?</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-8",
                            !manualDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {manualDate ? format(manualDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0" 
                        align="start" 
                        side="bottom"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="cursor-pointer hover:cursor-pointer">
                          <Calendar
                            mode="single"
                            selected={manualDate}
                            onSelect={setManualDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time of day</label>
                    <Select value={manualTime} onValueChange={setManualTime}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select time..." />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time.charAt(0).toUpperCase() + time.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">How'd it go?</label>
                  <Textarea
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="• What did you talk about?
• How did you meet?
• How'd you feel about the person / activity?"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {(selectedEvent || (isManualEntry && manualAttendees.length > 0 && manualActivity)) && (
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
