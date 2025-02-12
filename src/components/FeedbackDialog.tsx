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
import { CalendarIcon, X, Archive, ArrowLeft } from "lucide-react";
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
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState<number>(-1);
  const [manualActivity, setManualActivity] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualDate, setManualDate] = useState<Date | undefined>(new Date());
  const [manualTime, setManualTime] = useState<string>("afternoon");
  const [manualNotes, setManualNotes] = useState("");
  const [contactSearchInput, setContactSearchInput] = useState("");
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(false);
  const [moodOptions] = useState([
    "fun",
    "chill",
    "deep",
    "productive",
    "nostalgic",
    "exciting",
    "meaningful"
  ]);

  const timeOptions = ["morning", "afternoon", "evening", "night"];

  // Query to fetch recent calendar events that need feedback
  const { data: recentEvents = [] } = useQuery({
    queryKey: ['recent-events-without-feedback'],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          start_time,
          location,
          feedback_sent,
          event_attendees!inner (
            contacts!contact_id (
              id,
              name
            )
          )
        `)
        .eq('user_id', session.user.id)
        .eq('feedback_sent', false) // Only fetch events without feedback
        .gte('start_time', thirtyDaysAgo.toISOString())
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
    enabled: open && !selectedEventId // Only fetch when dialog is open and no specific event is selected
  });

  // Query to fetch specific event details when selectedEventId is provided
  const { data: eventDetails } = useQuery({
    queryKey: ['event-details', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;

      const { data: event, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          event_attendees!inner (
            contacts!contact_id (
              id,
              name
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

  useEffect(() => {
    if (!open) {
      if (!selectedEventId) {
        setSelectedEvent(null);
        setHangDescription("");
        setSelectedMood("");
      }
    }
  }, [open, selectedEventId]);

  const handleContactSelect = (contact: Contact) => {
    if (!selectedContacts.some(c => c.id === contact.id)) {
      setSelectedContacts(prev => [...prev, contact]);
    }
    setContactSearchInput('');
  };

  const openContactDrawer = (index: number) => {
    setSelectedContactIndex(index);
    setIsContactDrawerOpen(true);
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleBackClick = () => {
    setSelectedEvent(null);
    setHangDescription("");
    setSelectedMood("");
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) return;

    try {
      let description = hangDescription;
      if (selectedMood) {
        description = `Mood: ${selectedMood}. ${description}`;
      }

      if (selectedEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            description,
            feedback_sent: true
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;
      } else if (isManualEntry && manualDate) {
        // Format the dates properly for Supabase
        const startTime = new Date(manualDate);
        // Set the time based on the selected time of day
        switch (manualTime) {
          case 'morning':
            startTime.setHours(9, 0, 0, 0);
            break;
          case 'afternoon':
            startTime.setHours(14, 0, 0, 0);
            break;
          case 'evening':
            startTime.setHours(18, 0, 0, 0);
            break;
          case 'night':
            startTime.setHours(20, 0, 0, 0);
            break;
        }
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1); // Default to 1-hour duration

        // Handle manual entry submission with properly formatted dates
        const { error } = await supabase
          .from('calendar_events')
          .insert({
            user_id: session.user.id,
            title: manualActivity,
            description: manualNotes,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            location: manualLocation,
          });

        if (error) throw error;
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

  useEffect(() => {
    if (selectedEventId) {
      const selected = recentEvents.find(event => event.id === selectedEventId);
      if (selected) {
        setSelectedEvent(selected);
        setIsManualEntry(false);
      }
    }
  }, [selectedEventId, recentEvents]);

  useEffect(() => {
    if (!open) {
      setSelectedEvent(null);
      setHangDescription("");
      setSelectedMood("");
      setSelectedContacts([]);
      setManualActivity("");
      setManualLocation("");
      setManualDate(undefined);
      setManualTime("afternoon");
      setManualNotes("");
      setContactSearchInput("");
    }
  }, [open]);

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

            {!isManualEntry ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {selectedEvent && (
                    <Button
                      variant="ghost"
                      onClick={handleBackClick}
                      className="flex items-center gap-1.5 mb-4 h-8 px-2 -ml-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to events
                    </Button>
                  )}
                  
                  {recentEvents.map((event) => {
                    if (selectedEvent && selectedEvent.id !== event.id) {
                      return null;
                    }

                    return (
                      <div
                        key={event.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedEvent?.id === event.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => handleEventSelect(event)}
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
                    );
                  })}
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
                        {selectedContacts.map((contact, index) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs cursor-pointer"
                            onClick={() => openContactDrawer(index)}
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
