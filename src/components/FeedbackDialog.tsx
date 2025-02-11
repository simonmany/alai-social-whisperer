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
import { CalendarIcon, X, Bot } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EventAttendee extends Contact {}

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
  
  // Manual entry form state
  const [manualAttendees, setManualAttendees] = useState<string[]>([]);
  const [manualActivity, setManualActivity] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualDate, setManualDate] = useState<Date | undefined>(new Date());
  const [manualTime, setManualTime] = useState<string>("afternoon");
  const [manualNotes, setManualNotes] = useState("");
  const [contactSearchInput, setContactSearchInput] = useState("");
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
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const filteredContacts = contacts
    .filter(contact => 
      contact.name.toLowerCase().includes(contactSearchInput.toLowerCase()) &&
      !manualAttendees.includes(contact.id)
    )
    .slice(0, 5);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const addContact = (contact: Contact) => {
    console.log('Adding existing contact:', contact);
    setManualAttendees([...manualAttendees, contact.id]);
    setContactSearchInput("");
  };

  const removeContact = (contactId: string) => {
    console.log('Removing contact:', contactId);
    setManualAttendees(manualAttendees.filter(id => id !== contactId));
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called - starting submission process');

    if (isManualEntry) {
      console.log('Manual entry mode detected');
      
      if (!manualDate || !manualActivity || manualAttendees.length === 0) {
        console.log('Validation failed:', { manualDate, manualActivity, attendeesCount: manualAttendees.length });
        return;
      }

      // Create the event time based on the selected time of day
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
        attendeeIds: manualAttendees,
        userId: session?.user?.id
      });

      try {
        if (!session?.user?.id) {
          console.error('No user session found');
          return;
        }

        // Insert the calendar event
        const { data: newEvent, error: eventError } = await supabase
          .from('calendar_events')
          .insert({
            title: manualActivity,
            description: manualLocation,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            user_id: session.user.id
          })
          .select()
          .single();

        if (eventError) {
          console.error('Error creating event:', eventError);
          return;
        }

        console.log('Successfully created event:', newEvent);

        // Insert event attendees using the existing contact IDs
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

        // Get the contact names for the message
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
      let message = `I had a ${selectedMood ? selectedMood + " " : ""}hang with ${attendeeNames} at ${selectedEvent.location} on ${selectedEvent.date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      })} at ${selectedEvent.date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}. We ${selectedEvent.title.toLowerCase()}.`;

      if (hangDescription) {
        message += ` ${hangDescription}`;
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
        <DialogContent className="sm:max-w-[425px] overflow-visible">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg">Tell me about your hang</DialogTitle>
              {selectedEvent && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedEvent.title}
                    </span>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Activity Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">What did you do?</label>
              <Input
                placeholder="Type an activity..."
                value={manualActivity}
                onChange={(e) => setManualActivity(e.target.value)}
                className="h-8"
              />
            </div>

            {/* Contact Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Who was there?</label>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleAiPickContact}
                >
                  <Bot className="h-3.5 w-3.5" />
                  Have Al pick
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder="Search your contacts..."
                  value={contactSearchInput}
                  onChange={(e) => setContactSearchInput(e.target.value)}
                  className="h-8"
                />
                {contactSearchInput && filteredContacts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                        onClick={() => addContact(contact)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{contact.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {manualAttendees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {contacts
                    .filter(contact => manualAttendees.includes(contact.id))
                    .map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{contact.name}</span>
                        <button
                          onClick={() => removeContact(contact.id)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Date and Time Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">When did you hang?</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-8"
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

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={isManualEntry ? (!manualDate || !manualActivity || manualAttendees.length === 0) : !selectedEvent}
              className="w-full"
            >
              Submit
            </Button>
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
