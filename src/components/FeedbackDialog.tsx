
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
import { Badge } from "@/components/ui/badge";

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
    if (isManualEntry) {
      if (!manualDate || !manualActivity || selectedContacts.length === 0) {
        return;
      }

      const eventDate = new Date(manualDate);
      const startHour = manualTime === 'morning' ? 9 : manualTime === 'afternoon' ? 14 : 19;
      const endHour = startHour + 1;

      const startTime = new Date(eventDate.setHours(startHour, 0, 0, 0));
      const endTime = new Date(eventDate.setHours(endHour, 0, 0, 0));

      try {
        if (!session?.user?.id) {
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
          return;
        }

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

        const attendeeNames = selectedContacts.map(contact => contact.name).join(', ');

        let message = `I had a hang with ${attendeeNames} at ${manualLocation} on ${format(manualDate, 'EEEE, MMMM d')} in the ${manualTime}. We ${manualActivity.toLowerCase()}.`;
        
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

        onSubmit(message);
      } catch (error) {
        console.error('Error in event submission process:', error);
      }
    } else if (selectedEvent) {
      const attendeeNames = formatAttendeeNames(selectedEvent.attendees);
      const location = selectedEvent.location && selectedEvent.location !== "No location specified" ? selectedEvent.location : "";
      let message = `I had a ${selectedMood ? selectedMood + " " : ""}hang ${attendeeNames ? "with " + attendeeNames : ""} ${location? "at " + location : ""} on ${format(new Date(selectedEvent.date), "EEEE, MMMM d")} at ${format(new Date(selectedEvent.date), "h:mm a")}. We ${selectedEvent.title.toLowerCase()}.`;

      if (hangDescription) {
        message += ` ${hangDescription}`;
      }
      
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

  const handleContactSelect = (contact: Contact) => {
    if (!selectedContacts.some(selected => selected.id === contact.id)) {
      setSelectedContacts(prev => [...prev, contact]);
    }
    setContactSearchInput("");
  };

  const openContactDrawer = (index: number) => {
    setSelectedContactIndex(index);
    setIsContactDrawerOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tell me about your hang</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Who would you like to catch up with?</p>
              <div className="relative">
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
                        className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer border-b last:border-b-0 justify-between"
                        onClick={() => handleContactSelect(contact)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(contact.name)}
                            </AvatarFallback>
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
                
                {manualActivity && activitySuggestions.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    {activitySuggestions.map((activity) => (
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
