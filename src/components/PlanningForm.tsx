import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Shuffle, Calendar, MapPin, UserPlus } from "lucide-react";
import { Contact } from "@/types/chat";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse, isValid } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ContactsDialog from "@/components/ContactsDialog";
import { generateChatResponse, ConversationType } from "@/utils/openai";

interface PlanningFormProps {
  onSubmit: (message: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  onUpdate?: (formState: {
    contacts: Contact[];
    activity: string;
    location: string;
    date?: Date;
    time?: string;
  }) => void;
}

export const PlanningForm = ({
  onSubmit,
  defaultContacts = [],
  defaultActivity = "",
  defaultLocation = "",
  defaultDate,
  onUpdate
}: PlanningFormProps) => {
  const [step, setStep] = useState<'main' | 'contacts' | 'activity' | 'datetime'>('main');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>(defaultContacts);
  const [activity, setActivity] = useState(defaultActivity);
  const [location, setLocation] = useState(defaultLocation);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate);
  const [selectedTime, setSelectedTime] = useState<string>();
  const [contactInput, setContactInput] = useState("");
  const [showContactDialog, setShowContactDialog] = useState(false);
  const { session } = useAuth();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) throw error;
      
      return (data || []).map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: !!session?.user?.id
  });

  const { data: closeContacts = [] } = useQuery({
    queryKey: ['closeContacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('closeness')
        .limit(10);
      
      if (error) throw error;
      return (data || []).map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: !!session?.user?.id
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

  const filteredContacts = contacts.filter(contact => 
    !selectedContacts.some(selected => selected.id === contact.id) &&
    (contactInput === "" || contact.name.toLowerCase().includes(contactInput.toLowerCase()))
  );

  const isComplete = {
    contacts: selectedContacts.length > 0,
    activity: activity.length > 0,
    datetime: selectedDate !== undefined && selectedTime !== undefined,
    location: location.length > 0
  };

  const allFieldsComplete = isComplete.contacts && isComplete.activity && isComplete.datetime && isComplete.location;

  const handleSubmit = async () => {
    if (!session?.user?.id) return;
    
    if (!allFieldsComplete) {
      // Build context message about the current state of the event
      let contextMessage = "I'm planning an event.";
      
      // Add information about selected contacts and their interests
      if (selectedContacts.length > 0) {
        contextMessage += `\nAttendees: ${selectedContacts.map(c => c.name).join(', ')}`;
        const contactInterests = selectedContacts
          .filter(c => c.interests?.length)
          .map(c => `${c.name}: ${c.interests?.join(', ')}`);
        if (contactInterests.length) {
          contextMessage += `\nTheir interests include: ${contactInterests.join('\n')}`;
        }
      }
      
      // Add activity if selected
      if (activity) {
        contextMessage += `\nActivity: ${activity}`;
      }
      
      // Add location if selected
      if (location) {
        contextMessage += `\nLocation: ${location}`;
      }
      
      // Add date/time if selected
      if (selectedDate && selectedTime) {
        contextMessage += `\nTime: ${format(selectedDate, 'EEE, MMM d')} at ${selectedTime}`;
      }

      // Add what needs to be filled
      contextMessage += '\n\nPlease help me fill in:';
      if (!isComplete.contacts) contextMessage += '\n- Suggest contacts (prioritize those marked for catch-up and those in inner orbit)';
      if (!isComplete.activity) contextMessage += '\n- Suggest an activity (consider the interests of all participants)';
      if (!isComplete.datetime) contextMessage += '\n- Suggest a time in the next 7 days';
      if (!isComplete.location) contextMessage += '\n- Suggest a specific location for the activity';

      let relevantContacts = selectedContacts.length > 0 ? selectedContacts : closeContacts;

      try {
        // Send user prompt as secret message
        const data = await generateChatResponse(contextMessage, relevantContacts, false, ConversationType.HANG_GENERATOR);
        console.log('Received data:', data);

        if (data && typeof data === 'object') {
          const response = data.response || data;
          
          // Update form with AI suggestions
          let formUpdated = false;
          
          if (response.contacts?.length && !isComplete.contacts) {
            const suggestedContacts = contacts.filter(c => 
              response.contacts?.some(contact => contact.id === c.id)
            );
            if (suggestedContacts.length) {
              setSelectedContacts(suggestedContacts);
              formUpdated = true;
            }
          }

          if (response.activity && !isComplete.activity) {
            setActivity(response.activity);
            formUpdated = true;
          }

          if (response.datetime && !isComplete.datetime) {
            const date = parse(response.datetime.date, 'yyyy-MM-dd', new Date());
            if (isValid(date)) {
              setSelectedDate(date);
              setSelectedTime(response.datetime.time);
              formUpdated = true;
            }
          }

          if (response.location && !isComplete.location) {
            setLocation(response.location);
            formUpdated = true;
          }

          // Emit form update if any fields were changed
          if (formUpdated && onUpdate) {
            onUpdate({
              contacts: selectedContacts,
              activity,
              location,
              date: selectedDate,
              time: selectedTime
            });
          }
        }
      } catch (error) {
        console.error('Error getting AI suggestions:', error);
      }
      return;
    }

    // Convert date and time to UTC
    const [hours, minutes] = selectedTime.match(/\d+/g)!;
    const isPM = selectedTime.includes('PM');
    let hour = parseInt(hours);
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    
    const startDate = new Date(selectedDate);
    startDate.setHours(hour, parseInt(minutes));
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2); // Default to 2 hour events

    // Add event to calendar_events table
    try {
      const { error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: session.user.id,
          title: activity,
          description: `Hangout with ${selectedContacts.map(c => c.name).join(', ')}`,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          location: location,
          updated_at: new Date().toISOString()
        });

      if (eventError) {
        console.error('Error creating calendar event:', eventError);
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
    }

    // const dateStr = selectedDate ? format(selectedDate, 'PPP') : '';
    // const message = `I want to ${activity} with ${selectedContacts.map(c => c.name).join(', ')} ${
    //   location ? `at ${location}` : ''
    // } on ${dateStr} ${selectedTime || ''}`;
    onSubmit("Let's schedule that event!");
  };

  const handleContactSelect = (contact: Contact) => {
    if (selectedContacts.some(c => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const handleNewContactSubmit = (message: string, contact: Contact) => {
    setSelectedContacts([...selectedContacts, contact]);
    setShowContactDialog(false);
  };

  return (
    <div className="space-y-4 w-full bg-white rounded-lg p-4 border">
      {step === 'contacts' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add Contacts</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Input
                  placeholder="Search contacts..."
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                />
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search contacts..." />
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {filteredContacts.map(contact => (
                      <CommandItem
                        key={contact.id}
                        value={contact.name}
                        onSelect={() => {
                          handleContactSelect(contact);
                          setContactInput("");
                        }}
                      >
                        {contact.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex flex-wrap gap-2">
              {selectedContacts.map(contact => (
                <Button
                  key={contact.id}
                  variant="secondary"
                  className="h-8 px-3 flex items-center gap-2"
                  onClick={() => handleContactSelect(contact)}
                >
                  {contact.name}
                  <span className="text-xs">×</span>
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setShowContactDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Contact
            </Button>
          </div>

          <Button
            onClick={() => setStep('main')}
            className="w-full"
          >
            Done
          </Button>

          <ContactsDialog
            open={showContactDialog}
            onOpenChange={setShowContactDialog}
            onSubmit={handleNewContactSubmit}
            userId={session?.user?.id || ""}
          />
        </div>
      )}

      {step === 'main' && (
        <div className="space-y-4">
          <Button
            variant="outline"
            className={`w-full justify-start text-left h-auto py-4 px-6 relative ${
              isComplete.contacts ? 'border-2 border-purple-300 hover:border-purple-400' : ''
            }`}
            onClick={() => setStep('contacts')}
          >
            <div className="flex items-center gap-3 w-full">
              <Users className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium mb-0.5">Who's coming?</div>
                {selectedContacts.length > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {selectedContacts.length <= 5 ? (
                      selectedContacts.map((contact, index) => (
                        <span key={contact.id}>
                          {contact.name}
                          {index < selectedContacts.length - 1 ? ', ' : ''}
                        </span>
                      ))
                    ) : (
                      `${selectedContacts.length} contacts selected`
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Select contacts</div>
                )}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className={`w-full justify-start text-left h-auto py-4 px-6 relative ${
              isComplete.activity ? 'border-2 border-purple-300 hover:border-purple-400' : ''
            }`}
            onClick={() => setStep('activity')}
          >
            <div className="flex items-center gap-3 w-full">
              <Shuffle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium mb-0.5">What do you want to do?</div>
                {activity ? (
                  <div className="text-sm text-muted-foreground">{activity}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">Choose an activity</div>
                )}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className={`w-full justify-start text-left h-auto py-4 px-6 relative ${
              isComplete.datetime ? 'border-2 border-purple-300 hover:border-purple-400' : ''
            }`}
            onClick={() => setStep('datetime')}
          >
            <div className="flex items-center gap-3 w-full">
              <Calendar className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium mb-0.5">When?</div>
                {selectedDate && selectedTime ? (
                  <div className="text-sm text-muted-foreground">
                    {format(selectedDate, 'PPP')} at {selectedTime}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Pick a date and time</div>
                )}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className={`w-full justify-start text-left h-auto py-4 px-6 relative ${
              isComplete.location ? 'border-2 border-purple-300 hover:border-purple-400' : ''
            }`}
            onClick={() => setStep('location')}
          >
            <div className="flex items-center gap-3 w-full">
              <MapPin className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <div className="font-medium mb-0.5">Where?</div>
                {location ? (
                  <div className="text-sm text-muted-foreground">{location}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">Choose a location</div>
                )}
              </div>
            </div>
          </Button>

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {!isComplete.contacts && !isComplete.activity && !isComplete.datetime && !isComplete.location
                ? "Figure it out for me!"
                : allFieldsComplete
                ? "Looks good - Plan it!"
                : "Figure out the rest!"}
            </Button>
          </div>
        </div>
      )}

      {step === 'activity' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity">Activity</Label>
            <div className="flex gap-2">
              <Input
                id="activity"
                value={activity}
                onChange={(e) => {
                  setActivity(e.target.value);
                  if (onUpdate) {
                    onUpdate({
                      contacts: selectedContacts,
                      activity: e.target.value,
                      location,
                      date: selectedDate,
                      time: selectedTime
                    });
                  }
                }}
                placeholder="e.g. get coffee, go for a walk, grab lunch"
                className="flex-1"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search activities..." />
                    <CommandEmpty>No activities found.</CommandEmpty>
                    <CommandGroup>
                      {activities
                        .filter(act => 
                          activity === "" || 
                          act.name.toLowerCase().includes(activity.toLowerCase())
                        )
                        .map(act => (
                          <CommandItem
                            key={act.id}
                            value={act.name}
                            onSelect={() => {
                              setActivity(act.name);
                              if (onUpdate) {
                                onUpdate({
                                  contacts: selectedContacts,
                                  activity: act.name,
                                  location,
                                  date: selectedDate,
                                  time: selectedTime
                                });
                              }
                            }}
                          >
                            {act.name}
                          </CommandItem>
                        ))
                      }
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button
            onClick={() => setStep('main')}
            className="w-full"
          >
            Done
          </Button>
        </div>
      )}

      {step === 'datetime' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setStep('main')}
            className="w-full"
          >
            Done
          </Button>
        </div>
      )}

      {step === 'location' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Central Park, Joe's Coffee, etc."
            />
          </div>
          <Button
            onClick={() => setStep('main')}
            className="w-full"
          >
            Done
          </Button>
        </div>
      )}

    </div>
  );
};
