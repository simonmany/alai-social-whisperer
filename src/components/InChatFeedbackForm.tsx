import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Contact } from '@/types/contacts';
import { CalendarEvent } from '@/types/calendar';
import { format } from 'date-fns';
import { ArrowLeft, CalendarIcon, MapPinIcon, UsersIcon, ThumbsUp, ThumbsDown, Plus, UserPlus, Clock, X, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { TIME_OPTIONS } from '@/utils/constants';

interface InChatFeedbackFormProps {
  onSubmit: (message: string, event?: CalendarEvent, mood?: string[], notes?: string) => void;
  event?: CalendarEvent;
  skipEventSelection?: boolean;
  feedbackStep?: "event-selection" | "event-creation" | "mood-selection" | "notes-input" | "complete";
  selectedEvent?: CalendarEvent;
  selectedMoods?: string[];
  feedbackNotes?: string;
}

export const InChatFeedbackForm = ({
  onSubmit,
  event,
  skipEventSelection = false,
  feedbackStep = "event-selection",
  selectedEvent: initialSelectedEvent,
  selectedMoods: initialSelectedMoods = [],
  feedbackNotes: initialFeedbackNotes = ""
}: InChatFeedbackFormProps) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(initialSelectedEvent || event || null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [notes, setNotes] = useState(initialFeedbackNotes);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(initialSelectedMoods);
  const [currentStep, setCurrentStep] = useState<"event-selection" | "event-creation" | "mood-selection" | "notes-input" | "complete">(feedbackStep);
  const { toast } = useToast();
  
  // Event creation and editing state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [eventTime, setEventTime] = useState<string>('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventAttendees, setEventAttendees] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingAttendee, setIsAddingAttendee] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  
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
    enabled: !!session?.user?.id && (currentStep === "event-creation" || isAddingAttendee)
  });

  // Fetch past events for selection
  const { data: recentEvents = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['recentEvents'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const now = new Date().toISOString();
      
      // Get all past events
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          start_time,
          location,
          feedback_sent,
          event_attendees!left (
            contacts!contact_id (
              id,
              name
            )
          )
        `)
        .eq('user_id', session.user.id)
        .lt('start_time', now)
        .order('start_time', { ascending: false })
        .limit(20);
        
      if (error) {
        console.error('Error fetching recent events:', error);
        throw error;
      }
      
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
          
          return {
            id: event.id,
            title: event.title,
            start_time: event.start_time,
            location: event.location,
            attendees,
            time: timeStr
          };
        });
      return events;
    },
    enabled: !!session?.user?.id && currentStep === "event-selection",
    refetchOnMount: true
  });

  // Available mood options
  const moodOptions = [
    'fun', 'chill', 'deep', 'productive', 'nostalgic', 'exciting'
  ];
  
  const [customMood, setCustomMood] = useState('');
  const [showCustomMoodInput, setShowCustomMoodInput] = useState(false);

  // Initialize event data for editing
  const initializeEventData = (event: CalendarEvent) => {
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
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    
    setEventLocation(event.location || '');
    setEventAttendees(event.attendees || []);
  };

  // Handle event selection
  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setCurrentStep("mood-selection");
  };

  // Handle "Something off the books" selection
  const handleOffTheBooks = () => {
    setIsManualEntry(true);
    setSelectedEvent(null);
    setCurrentStep("event-creation");
  };

  // Handle mood selection
  const handleMoodSelect = (mood: string) => {
    // Toggle mood selection
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else {
      setSelectedMoods([...selectedMoods, mood]);
    }
  };
  
  // Handle custom mood input
  const handleCustomMoodAdd = () => {
    if (customMood.trim()) {
      // Add custom mood to selected moods
      if (!selectedMoods.includes(customMood.trim())) {
        setSelectedMoods([...selectedMoods, customMood.trim()]);
      }
      setCustomMood('');
      setShowCustomMoodInput(false);
    }
  };

  // Handle thumbs up/down selection
  const handleThumbsSelection = (isGood: boolean) => {
    const mood = isGood ? "good" : "bad";
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else {
      // Remove the opposite mood if present
      const filteredMoods = selectedMoods.filter(m => m !== (isGood ? "bad" : "good"));
      setSelectedMoods([...filteredMoods, mood]);
    }
  };

  // Handle adding an attendee
  const handleAddAttendee = (contact: Contact) => {
    if (!eventAttendees.some(a => a.id === contact.id)) {
      setEventAttendees([...eventAttendees, contact]);
    }
    setIsAddingAttendee(false);
    setSearchTerm('');
  };

  // Handle removing an attendee
  const handleRemoveAttendee = (contactId: string) => {
    setEventAttendees(eventAttendees.filter(a => a.id !== contactId));
  };

  // Handle event editing
  const handleEditEvent = (event: CalendarEvent) => {
    initializeEventData(event);
    setIsEditingEvent(true);
    setCurrentStep("event-creation");
  };

  // Handle event update or creation submission
  const handleEventCreationSubmit = async () => {
    if (!eventTitle.trim()) {
      toast({
        title: "Activity is required",
        description: "Please enter what you did",
        variant: "destructive",
      });
      return;
    }

    try {
      // Format the date and time
      let startTime: Date;
      if (eventDate && eventTime) {
        const [hours, minutes, period] = eventTime.match(/^(\d+):(\d+) (AM|PM)$/)?.slice(1) || [];
        let hour = parseInt(hours);
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        
        startTime = new Date(eventDate);
        startTime.setHours(hour, parseInt(minutes), 0, 0);
      } else {
        startTime = new Date();
      }

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      let eventData;

      if (isEditingEvent && selectedEvent) {
        // Update the existing event
        const { data, error } = await supabase
          .from('calendar_events')
          .update({
            title: eventTitle,
            location: eventLocation,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
          })
          .eq('id', selectedEvent.id)
          .select()
          .single();

        if (error) throw error;
        eventData = data;

        // Remove all existing attendees
        if (selectedEvent.attendees && selectedEvent.attendees.length > 0) {
          const { error: deleteError } = await supabase
            .from('event_attendees')
            .delete()
            .eq('event_id', selectedEvent.id);

          if (deleteError) throw deleteError;
        }
      } else {
        // Create a new event
        const { data, error } = await supabase
          .from('calendar_events')
          .insert({
            user_id: session?.user?.id,
            title: eventTitle,
            location: eventLocation,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        eventData = data;
      }

      // Add attendees if there are any
      if (eventAttendees.length > 0) {
        const attendeesToInsert = eventAttendees.map(contact => ({
          event_id: eventData.id,
          contact_id: contact.id
        }));

        const { error: attendeesError } = await supabase
          .from('event_attendees')
          .insert(attendeesToInsert);

        if (attendeesError) throw attendeesError;
      }

      // Set the created or updated event as the selected event
      setSelectedEvent({
        ...eventData,
        attendees: eventAttendees
      });

      // Reset editing state
      setIsEditingEvent(false);

      // Move to the mood selection step
      setCurrentStep("mood-selection");
    } catch (error) {
      console.error('Error creating/updating event:', error);
      toast({
        title: isEditingEvent ? "Error updating event" : "Error creating event",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Handle continue to notes step
  const handleContinueToNotes = () => {
    if (selectedMoods.length > 0) {
      setCurrentStep("notes-input");
    } else {
      toast({
        title: "Please select at least one mood",
        description: "Tell us how the event went before continuing",
        variant: "destructive",
      });
    }
  };

  // Handle notes submission
  const handleSubmitNotes = async () => {
    try {
      // Update the event in the database
      if (selectedEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            mood: selectedMoods.join(', '),
            feedback_notes: notes,
            feedback_sent: true
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;
      }

      // Format the message for the chat
      let message = '';
      
      if (selectedEvent) {
        message = `I attended "${selectedEvent.title}" and it was ${selectedMoods.join(', ')}.`;
        if (notes) {
          message += ` ${notes}`;
        }
      } else {
        message = `I had an event that wasn't on the calendar. It was ${selectedMoods.join(', ')}.`;
        if (notes) {
          message += ` ${notes}`;
        }
      }

      // Call the onSubmit callback with all the data
      onSubmit(message, selectedEvent || undefined, selectedMoods, notes);
      setCurrentStep("complete");
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast({
        title: "Error saving feedback",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Render event selection step
  const renderEventSelectionStep = () => (
    <div className="space-y-4 w-full">
      <div className="space-y-2 w-full">
        <h3 className="text-lg font-semibold">Select an event</h3>
        <p className="text-sm text-muted-foreground">
          Choose a recent event to provide feedback
        </p>
      </div>
      
      <div className="min-h-[100px] border rounded-lg p-4 bg-background w-full">
        {isLoadingEvents ? (
          <div className="text-center py-4 w-full">Loading events...</div>
        ) : recentEvents.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 w-full">
            {recentEvents.map(event => renderEventCard(event))}
          </div>
        ) : (
          <div className="text-center py-4 space-y-1 w-full">
            <p className="font-medium">You're all caught up!</p>
            <p className="text-sm text-muted-foreground">Feedback provided for all recent events</p>
          </div>
        )}
      </div>
      
      <Button
        variant="default"
        className="w-full mt-4 bg-black hover:bg-gray-800 text-white"
        onClick={handleOffTheBooks}
      >
        Something off the books
      </Button>
    </div>
  );

  // Render mood selection step
  const renderMoodSelectionStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">How'd it go?</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep("event-selection")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        {selectedEvent && (
          <div className="mb-4">
            {renderEventCard(selectedEvent, false)}
          </div>
        )}
      </div>
      
      <div className="flex justify-center gap-4 sm:gap-6 mb-4 w-full">
        <Button
          variant={selectedMoods.includes("good") ? "default" : "outline"}
          size="lg"
          className="flex-1 flex justify-center items-center p-4 sm:p-8 h-20 sm:h-24"
          onClick={() => handleThumbsSelection(true)}
        >
          <ThumbsUp className="h-10 w-10 sm:h-12 sm:w-12" />
        </Button>
        
        <Button
          variant={selectedMoods.includes("bad") ? "default" : "outline"}
          size="lg"
          className="flex-1 flex justify-center items-center p-4 sm:p-8 h-20 sm:h-24"
          onClick={() => handleThumbsSelection(false)}
        >
          <ThumbsDown className="h-10 w-10 sm:h-12 sm:w-12" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Select all that apply:</h3>
        <div className="flex flex-wrap gap-2">
          {moodOptions.map(mood => (
            <Button
              key={mood}
              variant={selectedMoods.includes(mood) ? "default" : "outline"}
              size="sm"
              onClick={() => handleMoodSelect(mood)}
            >
              {mood}
            </Button>
          ))}
          
          {/* Custom mood options */}
          {selectedMoods.filter(mood => 
            !moodOptions.includes(mood) && 
            mood !== "good" && 
            mood !== "bad"
          ).map(customMood => (
            <Button
              key={customMood}
              variant="default"
              size="sm"
              onClick={() => handleMoodSelect(customMood)}
            >
              {customMood}
            </Button>
          ))}
          
          {/* Custom mood input */}
          {showCustomMoodInput ? (
            <div className="flex gap-1 items-center w-full">
              <Input
                value={customMood}
                onChange={(e) => setCustomMood(e.target.value)}
                placeholder="Enter custom mood"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomMoodAdd();
                  }
                }}
              />
              <Button 
                size="sm" 
                onClick={handleCustomMoodAdd}
                disabled={!customMood.trim()}
              >
                Add
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomMoodInput(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              custom
            </Button>
          )}
        </div>
      </div>
      
      <Button 
        className="w-full"
        onClick={handleContinueToNotes}
        disabled={selectedMoods.length === 0}
      >
        Continue
      </Button>
    </div>
  );

  // Render notes input step
  const renderNotesInputStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">What did you talk about? Did anything memorable happen?</h3>
      </div>
      
      <Textarea
        placeholder="Share your thoughts about the event..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-[120px]"
      />
      
      <Button 
        className="w-full"
        onClick={handleSubmitNotes}
      >
        Submit Feedback
      </Button>
    </div>
  );

  // Render event card
  const renderEventCard = (event: CalendarEvent, clickable: boolean = true) => (
    <Card
      key={event.id}
      className={cn(
        'p-4 transition-colors relative w-full',
        clickable && 'hover:bg-accent cursor-pointer',
        selectedEvent?.id === event.id && 'border-primary'
      )}
      onClick={clickable ? () => handleEventSelect(event) : undefined}
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
          {event.attendees && event.attendees.length > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <UsersIcon className="h-3 w-3" />
              {event.attendees.map(a => a.name).join(', ')}
            </p>
          )}
        </div>
      </div>
      
      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-2 right-2 h-8 w-8"
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click
          handleEditEvent(event);
        }}
      >
        <Edit className="h-4 w-4" />
      </Button>
    </Card>
  );

  // Render event creation step
  const renderEventCreationStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {isEditingEvent ? "Edit event details" : "Tell us about your activity"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isEditingEvent 
                ? "Update the details of this event" 
                : "Create a new event that wasn't on your calendar"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsManualEntry(false);
              setCurrentStep("event-selection");
            }}
            className="text-muted-foreground h-9"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="event-title">What did you do?</Label>
          <Input
            id="event-title"
            placeholder="e.g. Coffee with Alex"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="event-date">When?</Label>
          <div className="flex gap-2">
            <div className="relative w-full">
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !eventDate && "text-muted-foreground"
                )}
                onClick={() => setShowCalendar(!showCalendar)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {eventDate ? format(eventDate, "PPP") : "Pick a date"}
              </Button>
              {showCalendar && (
                <div className="absolute top-full mt-1 z-10 bg-background border rounded-md shadow-md">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={(date) => {
                      setEventDate(date);
                      setShowCalendar(false);
                    }}
                    initialFocus
                  />
                </div>
              )}
            </div>
            
            <Select 
              value={eventTime} 
              onValueChange={setEventTime}
            >
              <SelectTrigger className="w-[160px] h-10">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Time" className="inline-block whitespace-nowrap" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time} className="whitespace-nowrap">
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="event-location">Where?</Label>
          <Input
            id="event-location"
            placeholder="e.g. Starbucks on Main St"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Who was there?</Label>
          {eventAttendees.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {eventAttendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                  <span className="text-sm">{attendee.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleRemoveAttendee(attendee.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {isAddingAttendee ? (
            <div className="space-y-2">
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <div className="max-h-[150px] overflow-y-auto border rounded-md">
                {isLoadingContacts ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Loading contacts...</div>
                ) : contacts.filter(c => 
                    c.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                    !eventAttendees.some(a => a.id === c.id)
                  ).length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">No contacts found</div>
                ) : (
                  contacts
                    .filter(c => 
                      c.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                      !eventAttendees.some(a => a.id === c.id)
                    )
                    .map(contact => (
                      <Button
                        key={contact.id}
                        variant="ghost"
                        className="w-full justify-start text-left px-2 py-1 h-auto"
                        onClick={() => handleAddAttendee(contact)}
                      >
                        {contact.name}
                      </Button>
                    ))
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingAttendee(false);
                    setSearchTerm('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setIsAddingAttendee(true)}
            >
              <UserPlus className="h-4 w-4" />
              <span>Add person</span>
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            setIsEditingEvent(false);
            setCurrentStep(isEditingEvent ? "mood-selection" : "event-selection");
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleEventCreationSubmit}>
          {isEditingEvent ? "Save Changes" : "Continue"}
        </Button>
      </div>
    </div>
  );

  // Render the appropriate step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case "event-selection":
        return renderEventSelectionStep();
      case "event-creation":
        return renderEventCreationStep();
      case "mood-selection":
        return renderMoodSelectionStep();
      case "notes-input":
        return renderNotesInputStep();
      case "complete":
        return null;
      default:
        return renderEventSelectionStep();
    }
  };

  // Skip event selection if specified
  useEffect(() => {
    if (skipEventSelection && currentStep === "event-selection" && event) {
      setSelectedEvent(event);
      setCurrentStep("mood-selection");
    }
  }, [skipEventSelection, event, currentStep]);

  return (
    <div className="space-y-4 w-full" style={{ width: '100%', minWidth: '100%' }}>
      {renderCurrentStep()}
    </div>
  );
};
