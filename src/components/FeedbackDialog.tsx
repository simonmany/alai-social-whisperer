import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContactCard } from "@/components/ContactCard";
import { Contact } from "@/types/contacts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, X, Archive } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState<number>(-1);
  const [manualActivity, setManualActivity] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualDate, setManualDate] = useState<Date | undefined>(new Date());
  const [manualTime, setManualTime] = useState<string>("afternoon");
  const [manualNotes, setManualNotes] = useState("");
  const [contactSearchInput, setContactSearchInput] = useState("");
  const [hangDescription, setHangDescription] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [viewingContactIndex, setViewingContactIndex] = useState<number>(-1);

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
        interests: Array.isArray(contact.interests) ? contact.interests : []
      })) as Contact[];
    },
    enabled: !!session?.user?.id
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: calendarData = { events: [], isConnected: false }, isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      if (!session?.user?.id) return { events: [], isConnected: false };

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('google_access_token, google_refresh_token, google_token_expires_at, has_google_calendar, google_token_expired')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return { events: [], isConnected: false };
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        console.log('Fetching events with feedback filter...');
        
        const { data: dbEvents, error: dbError } = await supabase
          .from("calendar_events")
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            location,
            google_event_id,
            feedback_sent,
            event_attendees!inner (
              contacts!contact_id (
                id,
                name
              )
            )
          `)
          .eq("user_id", session.user.id)
          .is("feedback_sent", false)  // Changed from .eq to .is to handle null values
          .gte("start_time", thirtyDaysAgo.toISOString())
          .lte("start_time", thirtyDaysFromNow.toISOString())
          .order("start_time", { ascending: false });

        if (dbError) {
          console.error("Error fetching calendar events:", dbError);
          return { events: [], isConnected: profile?.has_google_calendar && !profile?.google_token_expired };
        }

        const events = (dbEvents || []).map(event => ({
          id: event.id,
          title: event.title,
          date: new Date(event.start_time),
          description: event.description || undefined,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location || "No location specified",
          google_event_id: event.google_event_id || undefined,
          attendees: event.event_attendees?.map(attendee => ({
            id: attendee.contacts.id,
            name: attendee.contacts.name
          })) || []
        }));

        return { 
          events, 
          isConnected: profile?.has_google_calendar && !profile?.google_token_expired 
        };
      } catch (error) {
        console.error("Exception in fetchCalendarEvents:", error);
        return { events: [], isConnected: false };
      }
    },
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: 0
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['calendar-events-with-attendees'],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data: calendarEvents, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .is('feedback_sent', false)
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
            location: event.location || "No location specified",
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

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(contactSearchInput.toLowerCase()) &&
    !selectedContacts.some(selected => selected.id === contact.id)
  );

  const activitySuggestions = activities
    ?.filter(activity =>
      activity.name.toLowerCase().includes(manualActivity.toLowerCase()) &&
      activity.name.toLowerCase() !== manualActivity.toLowerCase()
    )
    .slice(0, 5) || [];

  const handleSubmit = async () => {
    console.log('handleSubmit called - starting submission process');

    if (isManualEntry) {
      console.log('Manual entry mode detected');
      
      if (!manualDate || !manualActivity || selectedContacts.length === 0) {
        console.log('Validation failed:', { manualDate, manualActivity, attendeesCount: selectedContacts.length });
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
        attendees: selectedContacts.map(contact => contact.id),
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
            location: manualLocation,
            description: manualNotes,
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

        const attendeePromises = selectedContacts.map(async contact => {
          const { data, error } = await supabase
            .from('event_attendees')
            .insert({
              event_id: newEvent.id,
              contact_id: contact.id
            })
            .select();
          
          if (error) {
            console.error(`Error inserting attendee ${contact.id}:`, error);
          }
          return { contact, data, error };
        });

        const attendeeResults = await Promise.all(attendeePromises);
        console.log('Attendee insertion results:', attendeeResults);

        const attendeeNames = selectedContacts.map(contact => contact.name).join(', ');

        let message = `I had a hang with ${attendeeNames} at ${manualLocation} on ${format(manualDate, 'EEEE, MMMM d')} in the ${manualTime}. We ${manualActivity.toLowerCase()}. ${manualNotes}`;
        console.log('Submitting message:', message);
        
        if (manualNotes) {
          message += ` ${manualNotes}`;
        }

        // Update relationship field for each contact
        for (const contact of selectedContacts) {
          const { error: contactUpdateError } = await supabase
            .from('contacts')
            .update({ relationship: message })
            .eq('id', contact.id);

          if (contactUpdateError) {
            console.error('Error updating contact relationship:', contactUpdateError);
          }
        }

        console.log('Submitting manual entry message:', message);
        onSubmit(message);
      } catch (error) {
        console.error('Error in event submission process:', error);
      }
    } else if (selectedEvent) {
      console.log('Selected existing event:', selectedEvent);
      const attendeeNames = formatAttendeeNames(selectedEvent.attendees);
      const location = selectedEvent.location && selectedEvent.location !== "No location specified" ? selectedEvent.location : "";
      let message = `I had a ${selectedMood ? selectedMood + " " : ""}hang ${attendeeNames ? "with " + attendeeNames : ""} ${location? "at " + location : ""} on ${format(new Date(selectedEvent.date), "EEEE, MMMM d")} at ${format(new Date(selectedEvent.date), "h:mm a")}. We ${selectedEvent.title.toLowerCase()}.`;

      if (hangDescription) {
        message += ` ${hangDescription}`;
      }
      
      if (hangDescription || selectedMood) {
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update({
            description: `${selectedMood ? `Mood: ${selectedMood}. ` : ''}${hangDescription || ''}`,
            feedback_sent: true,
          })
          .eq('id', selectedEvent.id);

          if (updateError) {
            console.error('Error updating feedback status:', updateError);
            return;
          }
        }
      else {
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update({ feedback_sent: true })
          .eq('id', selectedEvent.id);

          if (updateError) {
            console.error('Error updating feedback status:', updateError);
            return;
          }
        }

      console.log('Submitting existing event message:', message);
      onSubmit(message);
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setSelectedContacts([]);
    setIsManualEntry(false);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const [showActivitySuggestions, setShowActivitySuggestions] = useState(true);

  const handleContactSelect = (contact: Contact) => {
    console.log('Attempting to select contact:', contact);
    if (!selectedContacts.some(selected => selected.id === contact.id)) {
      console.log('Adding contact to selection:', contact.name);
      setSelectedContacts(prev => [...prev, contact]);
    }
    setContactSearchInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        {viewingContactIndex >= 0 && selectedContacts[viewingContactIndex] ? (
          <>
            <DialogHeader className="flex-row items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewingContactIndex(-1)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <ContactCard {...selectedContacts[viewingContactIndex]} />
          </>
        ) : (
          <>
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

              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedContacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs cursor-pointer"
                      onClick={() => setViewingContactIndex(index)}
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{contact.name}</span>
                      {contact.is_archived && (
                        <Archive className="h-3 w-3 text-muted-foreground" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContacts(prev => 
                            prev.filter(c => c.id !== contact.id)
                          );
                        }}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isManualEntry ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {recentEvents.map((event) => (
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
                              onClick={() => handleContactSelect(contact)}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(contact.name)}
                                  </AvatarFallback>
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
                      
                      {selectedContacts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedContacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs cursor-pointer"
                              onClick={() => setViewingContactIndex(selectedContacts.indexOf(contact))}
                            >
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(contact.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{contact.name}</span>
                              {contact.is_archived && (
                                <Archive className="h-3 w-3 text-muted-foreground" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedContacts(prev => 
                                    prev.filter(c => c.id !== contact.id)
                                  );
                                }}
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
                        onChange={(e) => {
                          setManualActivity(e.target.value);
                          setShowActivitySuggestions(true);
                        }}
                        className="h-8"
                      />
                      
                      {manualActivity && showActivitySuggestions && activitySuggestions.length > 0 && (
                        <div className="border rounded-md overflow-hidden">
                          {activitySuggestions.map((activity) => (
                            <div
                              key={activity.id}
                              className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setManualActivity(activity.name);
                                setShowActivitySuggestions(false);
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

              {(selectedEvent || (isManualEntry && selectedContacts.length > 0 && manualActivity)) && (
                <Button className="w-full" onClick={handleSubmit}>
                  Submit Feedback
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
