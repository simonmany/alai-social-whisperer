
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
    "fun", "chill", "deep", "productive", "nostalgic", "exciting", "meaningful"
  ]);

  const timeOptions = ["morning", "afternoon", "evening", "night"];

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

        // Set the description and mood if they exist
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
        .eq('feedback_sent', false)
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
    enabled: open && !selectedEventId
  });

  // Query to fetch filtered contacts
  const { data: filteredContacts = [] } = useQuery({
    queryKey: ['filtered-contacts', contactSearchInput],
    queryFn: async () => {
      if (!session?.user?.id || !contactSearchInput) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, is_archived')
        .ilike('name', `%${contactSearchInput}%`)
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!contactSearchInput && !!session?.user?.id
  });

  // Query to fetch activity suggestions
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

  // Set selectedEvent when eventDetails changes
  useEffect(() => {
    if (eventDetails) {
      setSelectedEvent(eventDetails);
      setIsManualEntry(false);
    }
  }, [eventDetails]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      if (!selectedEventId) {
        setSelectedEvent(null);
        setHangDescription("");
        setSelectedMood("");
      }
    }
  }, [open, selectedEventId]);

  const handleBackClick = () => {
    if (!selectedEventId) {
      setSelectedEvent(null);
      setHangDescription("");
      setSelectedMood("");
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
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
                          <div className="flex flex-wrap gap-2">
                            {selectedEvent?.attendees.map((attendee) => (
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
                    </div>
                  </>
                )}
              </div>
            )}

            {isManualEntry && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Who was there?</h4>
                  <div className="space-y-2">
                    <Input 
                      value={contactSearchInput}
                      onChange={(e) => setContactSearchInput(e.target.value)}
                      placeholder="Search contacts..."
                    />
                    {contactSearchInput && filteredContacts.length > 0 && (
                      <div className="bg-popover border rounded-md shadow-md p-1">
                        {filteredContacts.map((contact) => (
                          <Button
                            key={contact.id}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedContacts(prev => [...prev, contact]);
                              setContactSearchInput('');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                              </Avatar>
                              <span>{contact.name}</span>
                              {contact.is_archived && (
                                <Archive className="h-3 w-3 ml-2 text-muted-foreground" />
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {selectedContacts.map((contact, index) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs cursor-pointer"
                          onClick={() => {
                            setSelectedContactIndex(index);
                            setIsContactDrawerOpen(true);
                          }}
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{contact.name}</span>
                          <X
                            className="h-3 w-3 ml-1 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContacts(prev => prev.filter((_, i) => i !== index));
                            }}
                          />
                        </div>
                      ))}
                    </div>
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
                        // Delay hiding suggestions to allow for clicks
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !manualDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {manualDate ? format(manualDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={manualDate}
                        onSelect={setManualDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Select value={manualTime} onValueChange={setManualTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time of day" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="• What did you talk about?
• How'd you feel about the activity?
• Any memorable moments?"
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
