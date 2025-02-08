
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
import { CalendarIcon, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  
  // Manual entry form state
  const [manualAttendees, setManualAttendees] = useState<string[]>([]);
  const [manualActivity, setManualActivity] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualDate, setManualDate] = useState<Date | undefined>(new Date());
  const [manualTime, setManualTime] = useState<string>("afternoon");
  const [manualNotes, setManualNotes] = useState("");
  const [contactSearchInput, setContactSearchInput] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

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
        (calendarEvents || []).map(async (event) => {
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
            .in('id', (attendeeLinks || []).map(link => link.contact_id));

          if (contactsError) {
            console.error('Error fetching contacts:', contactsError);
            return null;
          }

          return {
            id: event.id,
            title: event.title,
            date: new Date(event.start_time),
            location: event.description || "No location specified",
            attendees: contacts || []
          } as Event;
        })
      );

      return eventsWithAttendees.filter((event): event is Event => 
        event !== null && 
        'id' in event && 
        'title' in event && 
        'date' in event && 
        'location' in event && 
        'attendees' in event
      );
    },
    enabled: !!session?.user?.id
  });

  const filteredContacts = contacts
    .filter(contact => 
      contact.name.toLowerCase().includes(contactSearchInput.toLowerCase())
    )
    .slice(0, 5);

  const filteredActivities = activities
    .filter(activity =>
      activity.name.toLowerCase().includes(manualActivity.toLowerCase())
    )
    .slice(0, 5);

  const handleSubmit = async () => {
    if (isManualEntry) {
      if (!manualDate || !manualActivity || manualAttendees.length === 0) return;

      const { data: newEvent, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          title: manualActivity,
          description: manualLocation,
          start_time: new Date(manualDate.setHours(
            manualTime === 'morning' ? 9 : manualTime === 'afternoon' ? 14 : 19,
            0, 0, 0
          )).toISOString(),
          end_time: new Date(manualDate.setHours(
            manualTime === 'morning' ? 10 : manualTime === 'afternoon' ? 15 : 20,
            0, 0, 0
          )).toISOString(),
          user_id: session?.user?.id
        })
        .select()
        .single();

      if (eventError) {
        console.error('Error creating event:', eventError);
        return;
      }

      const attendeePromises = manualAttendees.map(contactId =>
        supabase
          .from('event_attendees')
          .insert({
            event_id: newEvent.id,
            contact_id: contactId
          })
      );

      await Promise.all(attendeePromises);

      const attendeeNames = contacts
        .filter(contact => manualAttendees.includes(contact.id))
        .map(contact => contact.name)
        .join(', ');

      const message = `I had a hang with ${attendeeNames} at ${manualLocation} on ${format(manualDate, 'EEEE, MMMM d')} in the ${manualTime}. We ${manualActivity.toLowerCase()}. ${manualNotes}`;
      onSubmit(message);
    } else if (selectedEvent) {
      const attendeeNames = formatAttendeeNames(selectedEvent.attendees);
      const message = `I had a hang with ${attendeeNames} at ${selectedEvent.location} on ${selectedEvent.date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      })} at ${selectedEvent.date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}. We ${selectedEvent.title.toLowerCase()}.`;
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
  };

  const formatAttendeeNames = (attendees: EventAttendee[]) => {
    if (attendees.length === 0) return "";
    if (attendees.length === 1) return attendees[0].name;
    if (attendees.length === 2) return `${attendees[0].name} and ${attendees[1].name}`;
    const allButLast = attendees.slice(0, -1).map(a => a.name).join(", ");
    return `${allButLast}, and ${attendees[attendees.length - 1].name}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Who was there?</label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search contacts..."
                      value={contactSearchInput}
                      onChange={(e) => setContactSearchInput(e.target.value)}
                      className="h-8"
                    />
                    
                    {contactSearchInput && filteredContacts.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        {filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              if (!manualAttendees.includes(contact.id)) {
                                setManualAttendees([...manualAttendees, contact.id]);
                              }
                              setContactSearchInput("");
                            }}
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

                    {manualAttendees.length > 0 && (
                      <div className="flex flex-wrap gap-1">
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
                                onClick={() => setManualAttendees(prev => 
                                  prev.filter(id => id !== contact.id)
                                )}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
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
                      onChange={(e) => setManualActivity(e.target.value)}
                      className="h-8"
                    />
                    
                    {manualActivity && filteredActivities.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        {filteredActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                            onClick={() => setManualActivity(activity.name)}
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
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-8"
                      onClick={() => {
                        // The calendar will be implemented in a future iteration
                        // For now, we'll just use the current date
                        setManualDate(new Date());
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {manualDate ? format(manualDate, "PPP") : "Pick a date"}
                    </Button>
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
