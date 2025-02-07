
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ContactCard } from "@/components/ContactCard";
import { Contact } from "@/types/contacts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventAttendee {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meeting_story?: string;
  relationship?: string;
  closeness?: number;
}

interface Event {
  id: string;
  title: string;
  date: Date;
  location: string;
  attendees: EventAttendee[];
}

const feedbackOptions = ["Entertaining", "Energizing", "Educational", "It Sucked!"];
const timeOptions = ["morning", "afternoon", "evening"];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

export default function FeedbackDialog({ open, onOpenChange, onSubmit }: FeedbackDialogProps) {
  const { session } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [customFeedback, setCustomFeedback] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  
  // Manual entry form state
  const [manualAttendees, setManualAttendees] = useState<string[]>([]);
  const [manualActivity, setManualActivity] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualDate, setManualDate] = useState<Date | undefined>(new Date());
  const [manualTime, setManualTime] = useState<string>("afternoon");
  const [manualNotes, setManualNotes] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id);
      if (error) throw error;
      return data || [];  // Ensure we return an empty array if data is null
    }
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*');
      if (error) throw error;
      return data || [];  // Ensure we return an empty array if data is null
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
        (calendarEvents || []).map(async (event) => {  // Add null check here
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
            .select('id, name, email, phone, instagram, linkedin, twitter, meeting_story, relationship, closeness')
            .in('id', (attendeeLinks || []).map(link => link.contact_id));  // Add null check here

          if (contactsError) {
            console.error('Error fetching contacts:', contactsError);
            return null;
          }

          return {
            id: event.id,
            title: event.title,
            date: new Date(event.start_time),
            location: event.description || "No location specified",
            attendees: contacts as EventAttendee[] || []  // Ensure we have an empty array if contacts is null
          };
        })
      );

      return eventsWithAttendees.filter((event): event is Event => event !== null);
    },
    enabled: !!session?.user?.id
  });

  const formatAttendeeNames = (attendees: Contact[]) => {
    if (attendees.length === 0) return "";
    if (attendees.length === 1) return attendees[0].name;
    if (attendees.length === 2) return `${attendees[0].name} and ${attendees[1].name}`;
    const allButLast = attendees.slice(0, -1).map(a => a.name).join(", ");
    return `${allButLast}, and ${attendees[attendees.length - 1].name}`;
  };

  const handleSubmit = async () => {
    if (isManualEntry) {
      if (!manualDate || !manualActivity || manualAttendees.length === 0) return;

      // Create a new calendar event
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

      // Link attendees
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
      const feedback = customFeedback.trim() || selectedFeedback;
      if (feedback) {
        const message = `I had a hang with ${attendeeNames} at ${selectedEvent.location} on ${selectedEvent.date.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
        })} at ${selectedEvent.date.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}. We ${selectedEvent.title.toLowerCase()} and it was ${feedback.toLowerCase()}.`;
        onSubmit(message);
      }
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setSelectedFeedback(null);
    setCustomFeedback("");
    setSelectedContact(null);
    setIsManualEntry(false);
    setManualAttendees([]);
    setManualActivity("");
    setManualLocation("");
    setManualDate(new Date());
    setManualTime("afternoon");
    setManualNotes("");
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactDrawerOpen(true);
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
              // Calendar Events Section
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
              // Manual Entry Section
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Who was there?</label>
                  <div className="relative space-y-2">
                    <Command className="border rounded-md">
                      <CommandInput placeholder="Type to search contacts..." />
                      <CommandEmpty>No contacts found</CommandEmpty>
                      <CommandGroup>
                        {(contacts || []).map((contact) => (
                          <CommandItem
                            key={contact.id}
                            onSelect={() => {
                              setManualAttendees(prev =>
                                prev.includes(contact.id)
                                  ? prev.filter(id => id !== contact.id)
                                  : [...prev, contact.id]
                              );
                            }}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{contact.name}</span>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                manualAttendees.includes(contact.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>

                    {manualAttendees.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(contacts || [])
                          ?.filter(contact => manualAttendees.includes(contact.id))
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {manualActivity || "Select activity..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search activities..." />
                        <CommandEmpty>No activities found</CommandEmpty>
                        <CommandGroup>
                          {activities.map((activity) => (
                            <CommandItem
                              key={activity.id}
                              onSelect={() => setManualActivity(activity.name)}
                            >
                              {activity.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Where did you go?</label>
                  <Input
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="Enter location..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">When did you hang?</label>
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
                          {manualDate ? format(manualDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={manualDate}
                          onSelect={setManualDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time of day</label>
                    <Select value={manualTime} onValueChange={setManualTime}>
                      <SelectTrigger>
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

            {/* Submit Button */}
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
