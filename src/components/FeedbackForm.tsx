import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Contact } from '@/types/contact';
import { CalendarEvent } from '@/types/calendar';
import { format } from 'date-fns';
import { UserPlus, CalendarIcon, MapPinIcon, UsersIcon, Edit, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIME_OPTIONS } from '@/utils/constants';

interface FeedbackFormProps {
  onSubmit: (message: string) => void;
  onUpdate?: (formState: {
    event?: CalendarEvent;
    notes: string;
    mood: string;
  }) => void;
  event?: CalendarEvent;
  skipEventSelection?: boolean;
}

export const FeedbackForm = ({
  onSubmit,
  onUpdate,
  event,
  skipEventSelection = false
}: FeedbackFormProps) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(event || null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Editable event fields
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [eventTime, setEventTime] = useState<string>('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventAttendees, setEventAttendees] = useState<Contact[]>([]);
  const [isAddingAttendee, setIsAddingAttendee] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { session } = useAuth();

  // Fetch contacts for attendee selection
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });
  console.log('FeedbackForm - Session:', session?.user?.id);
  console.log('FeedbackForm - Component rendered');

  const { data: recentEvents = [], isLoading: isLoadingEvents, error: queryError } = useQuery({
    queryKey: ['recentEvents'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      console.log('Fetching recent events for user:', session.user.id);
      
      const now = new Date().toISOString();
      
      // First, get all past events
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          start_time,
          location,
          feedback_sent,
          event_attendees(contacts!contact_id(id, name))
        `)
        .eq('user_id', session.user.id)
        .lt('start_time', now)
        .order('start_time', { ascending: false })
        .limit(20);
        
      if (error) {
        console.error('Error fetching recent events:', error);
        throw error;
      }
      
      console.log('Fetched events:', data);
      
      const events = (data || [])
        .filter(event => !event.feedback_sent)
        .map(event => {
          let timeStr = '';
          let dateStr = '';
          
          try {
            const date = new Date(event.start_time);
            if (!isNaN(date.getTime())) {
              const hours = date.getHours();
              const minutes = date.getMinutes();
              const period = hours >= 12 ? 'PM' : 'AM';
              const displayHours = hours % 12 || 12;
              timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
              dateStr = format(date, 'PPP');
            }
          } catch (error) {
            console.error('Error parsing date:', error);
          }

          // Map attendees from event_attendees
          const attendees = event.event_attendees?.map(ea => ({
            id: ea.contacts.id,
            name: ea.contacts.name
          })) || [];
          
          console.log('Event time details:', {
            title: event.title,
            dateStr,
            timeStr,
            attendees
          });
          
          return {
            id: event.id,
            title: event.title,
            start_time: event.start_time,
            location: event.location,
            attendees,
            time: timeStr
          };
        });
      console.log('Mapped events with time:', events);
      return events;
    },
    enabled: !!session?.user?.id,
    refetchOnMount: true,
    onSuccess: (data) => {
      console.log('FeedbackForm - Query succeeded:', data);
    },
    onError: (error) => {
      console.error('FeedbackForm - Query failed:', error);
    }
  });

  console.log('FeedbackForm - Current state:', {
    isLoadingEvents,
    recentEventsCount: recentEvents.length,
    queryError,
    sessionExists: !!session?.user?.id
  });

  const moodOptions = [
    'fun', 'chill', 'deep', 'productive', 'nostalgic', 'exciting', 'meaningful'
  ];

  const initializeEventData = (event: CalendarEvent | null) => {
    setSelectedEvent(event);
    setIsManualEntry(event === null);
    
    // Initialize editable fields
    if (event) {
      setEventTitle(event.title);
      
      try {
        const date = new Date(event.start_time);
        if (!isNaN(date.getTime())) {
          setEventDate(date);
          const hours = date.getHours();
          const minutes = date.getMinutes();
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
          setEventTime(timeString);
          
          console.log('Setting event time:', {
            title: event.title,
            date: date.toLocaleString(),
            time: timeString
          });
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
      
      setEventLocation(event.location || '');
      setEventAttendees(event.attendees || []);
      setIsEditingTitle(false);
    } else {
      setEventTitle('');
      setEventDate(undefined);
      setEventTime('');
      setEventLocation('');
      setEventAttendees([]);
    }
  };

  // Initialize event data when component mounts with pre-selected event
  useEffect(() => {
    if (event) {
      initializeEventData(event);
    }
  }, [event]);

  const handleEventSelect = (event: CalendarEvent | null) => {
    initializeEventData(event);
    
    if (onUpdate) {
      onUpdate({
        event: event || undefined,
        notes,
        mood: selectedMood
      });
    }
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setIsManualEntry(false);
    setNotes('');
    setSelectedMood('');
    setEventTitle('');
    setEventDate(undefined);
    setEventTime('');
    setEventLocation('');
    setEventAttendees([]);
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) return;

    // Validate required fields
    if (!eventTitle || !eventDate) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter an event title and date.",
        variant: "destructive",
      });
      return;
    }

    // Validate that either mood or notes is provided
    if (!selectedMood && !notes) {
      toast({
        title: "Missing Feedback",
        description: "Please provide either a mood or notes about the event.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let eventId = selectedEvent?.id;
      
      // If it's a manual entry or we're updating an event
      if (eventTitle && eventDate) {
        const eventDateTime = new Date(eventDate);
        if (eventTime) {
          // Parse time like "10:00 PM"
          const [timeStr, period] = eventTime.split(' ');
          let [hours, minutes] = timeStr.split(':').map(Number);
          
          // Adjust hours for PM
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          }
          // Adjust for 12 AM
          if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          eventDateTime.setHours(hours, minutes);
        } else {
          // Default to noon if no time specified
          eventDateTime.setHours(12, 0, 0, 0);
        }

        let eventDescription = notes;
        if (selectedMood) {
          eventDescription = `Mood: ${selectedMood}. ${notes}`;
        }

        // Calculate end time (1 hour after start time)
        const endDateTime = new Date(eventDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);

        const eventData = {
          user_id: session.user.id,
          title: eventTitle,
          start_time: eventDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: eventLocation,
          description: eventDescription,
          feedback_sent: true
        };

        if (selectedEvent) {
          // Update existing event
          const { error: updateError } = await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', selectedEvent.id);

          if (updateError) throw updateError;
        } else {
          // Create new event
          const { data: newEvent, error: createError } = await supabase
            .from('calendar_events')
            .insert(eventData)
            .select()
            .single();

          if (createError) throw createError;
          eventId = newEvent.id;
        }

        // Handle attendees
        if (eventId) {
          // Remove existing attendees
          await supabase
            .from('event_attendees')
            .delete()
            .eq('event_id', eventId);

          // Add new attendees
          const attendeePromises = eventAttendees
            .filter(a => a.name.trim())
            .map(async (attendee) => {
              // First create or update contact
              const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .upsert({
                  user_id: session.user.id,
                  name: attendee.name,
                })
                .select()
                .single();

              if (contactError) throw contactError;

              // Then create event_attendee
              const { error: attendeeError } = await supabase
                .from('event_attendees')
                .insert({
                  event_id: eventId,
                  contact_id: contact.id,
                });

              if (attendeeError) throw attendeeError;
            });

          await Promise.all(attendeePromises);
        }
      }

      // Construct message for AI
      let message = '';
      if (eventTitle) {
        message = `I want to tell you about "${eventTitle}" from ${format(eventDate!, 'PPP')}.\n`;
        if (eventLocation) {
          message += `Location: ${eventLocation}\n`;
        }
        if (eventAttendees.length) {
          message += `Attendees: ${eventAttendees.map(a => a.name).join(', ')}\n`;
        }
      }

      if (notes) {
        message += `\nNotes: ${notes}`;
      }
      if (selectedMood) {
        message += `\nMood: ${selectedMood}`;
      }

      onSubmit(message);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const renderEventCard = (event: CalendarEvent) => (
    <Card
      key={event.id}
      className={cn(
        'p-4 hover:bg-accent cursor-pointer transition-colors',
        selectedEvent?.id === event.id && 'border-primary'
      )}
      onClick={() => handleEventSelect(event)}
    >
      <div className="flex items-start gap-3">
        <CalendarIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="space-y-1 flex-1">
          <h4 className="font-medium">{event.title}</h4>
          <p className="text-sm text-muted-foreground">
            {(() => {
              try {
                const date = new Date(event.start_time);
                if (!isNaN(date.getTime())) {
                  return format(date, 'PPP');
                }
                return '';
              } catch (error) {
                console.error('Error parsing date:', error);
                return '';
              }
            })()}
          </p>
          {event.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              {event.location}
            </p>
          )}
          {event.attendees?.length > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <UsersIcon className="h-3 w-3" />
              {event.attendees.map(a => a.name).join(', ')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );

  if (!selectedEvent && !isManualEntry) {
    return (
      <div className="space-y-4 bg-card p-4 rounded-lg border shadow-sm w-full">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Past Events</h3>
          <p className="text-sm text-muted-foreground">
            Select an event to provide feedback, or choose "Something off the books" for other events
          </p>
        </div>

        <div className="grid gap-2">
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2" style={{ scrollbarWidth: 'thin' }}>
          {isLoadingEvents ? (
            <div className="text-sm text-muted-foreground">Loading recent events...</div>
          ) : recentEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent events found</div>
          ) : (
            recentEvents.map(renderEventCard)
          )}
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal mt-2 bg-black text-white hover:bg-black/90 hover:text-white border-black"
            onClick={() => handleEventSelect(null)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Something off the books
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {selectedEvent ? 'Selected Event' : isManualEntry ? 'Off the Books Event' : 'Past Events'}
        </h3>
        {(selectedEvent || isManualEntry) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground"
          >
            ← Back to events
          </Button>
        )}
      </div>

      {(selectedEvent || isManualEntry) && (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {selectedEvent && !isEditingTitle ? (
                <h2 className="text-xl font-semibold">{eventTitle}</h2>
              ) : (
                <Input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Event title"
                  className="text-xl font-semibold"
                />
              )}
              {selectedEvent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingTitle(!isEditingTitle)}
                  className="text-muted-foreground h-6 px-2"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {isEditingTitle ? 'Done' : 'Edit'}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="flex flex-col">
                  <div className="h-6 flex items-center">
                    <Label>Date</Label>
                  </div>
                  {isEditingDate ? (
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => {
                        setEventDate(date);
                        setIsEditingDate(false);
                      }}
                      className="rounded-md border mt-2"
                    />
                  ) : (
                    <div 
                      className="flex h-10 items-center justify-between text-sm text-muted-foreground px-3 border rounded-md hover:bg-accent hover:text-accent-foreground mt-2 cursor-pointer"
                      onClick={() => setIsEditingDate(true)}
                    >
                      <span>{eventDate ? format(eventDate, 'PPP') : 'No date selected'}</span>
                      <Edit className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex flex-col">
                  <div className="h-6 flex items-center">
                    <Label>Time</Label>
                  </div>
                  <Select value={eventTime} onValueChange={setEventTime}>
                    <SelectTrigger className="h-10 mt-2">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Event location"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Attendees</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingAttendee(true)}
                  className="h-6 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </Label>
              
              {isAddingAttendee && (
                <Card className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2"
                        onClick={() => setSearchTerm('')}
                      >
                        {searchTerm && <X className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {isLoadingContacts ? (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          Loading contacts...
                        </div>
                      ) : contacts.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          No contacts found
                        </div>
                      ) : (
                        contacts
                          .filter(contact => 
                            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                            !eventAttendees.some(att => att.id === contact.id)
                          )
                          .map(contact => (
                            <Button
                              key={contact.id}
                              variant="ghost"
                              className="w-full justify-start text-left"
                              onClick={() => {
                                setEventAttendees([...eventAttendees, contact]);
                                setSearchTerm('');
                                setIsAddingAttendee(false);
                              }}
                            >
                              {contact.name}
                            </Button>
                          ))
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingAttendee(false);
                        setSearchTerm('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}
              
              <div className="flex flex-wrap gap-2">
                {eventAttendees.map((attendee) => (
                  <div 
                    key={attendee.id} 
                    className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-sm"
                  >
                    <span>{attendee.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => setEventAttendees(eventAttendees.filter(a => a.id !== attendee.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">How was it?</h3>
            <p className="text-sm text-muted-foreground">
              Select the mood that best describes the event
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {moodOptions.map(mood => (
              <Button
                key={mood}
                variant={selectedMood === mood ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedMood(mood);
                  if (onUpdate) {
                    onUpdate({
                      event: selectedEvent || undefined,
                      notes,
                      mood
                    });
                  }
                }}
              >
                {mood}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Notes</h3>
            <p className="text-sm text-muted-foreground">
              Share your thoughts and reflections about the event
            </p>
          </div>
          
          <Textarea
            placeholder="What made this event memorable? What did you enjoy most? Any learnings or takeaways?"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (onUpdate) {
                onUpdate({
                  event: selectedEvent || undefined,
                  notes: e.target.value,
                  mood: selectedMood
                });
              }
            }}
            className="min-h-[120px]"
          />
        </div>

        <Button 
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!notes && !selectedMood}
        >
          Submit Feedback
        </Button>
      </div>
    </div>
  );
};
