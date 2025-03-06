import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Users, Shuffle, Calendar, MapPin, UserPlus, Bot } from "lucide-react";
import { Contact } from "@/types/contacts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parse, isValid } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ContactsDialog from "@/components/ContactsDialog";
import { generateChatResponse, ConversationType } from "@/utils/openai";

interface PlanningFormProps {
  onSubmit: (message: string, newContent?: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
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
  defaultTime,
  onUpdate
}: PlanningFormProps) => {
  const [step, setStep] = useState<'main' | 'contacts' | 'activity' | 'datetime' | 'location'>('main');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>(defaultContacts);
  const [activity, setActivity] = useState<string>(defaultActivity);
  const [location, setLocation] = useState<string>(defaultLocation);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [selectedTime, setSelectedTime] = useState<string>(defaultTime);
  const [contactInput, setContactInput] = useState("");
  const [showContactDialog, setShowContactDialog] = useState(false);
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [askingAl, setAskingAl] = useState<'contacts' | 'activity' | 'datetime' | 'location' | null>(null);

  // Define a type for the contacts map
  type ContactsMap = Map<string, Contact>;

  const { data: contactsData = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      // Fetch ALL contacts for the user using pagination to overcome the 1000 row limit
      // Supabase has a default limit of 1000 rows per query
      const fetchAllContacts = async () => {
        const PAGE_SIZE = 1000;
        let allContacts: any[] = [];
        let page = 0;
        let hasMore = true;
        
        while (hasMore) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          
          console.log(`Fetching contacts page ${page} (${from}-${to})`);
          
          const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', session.user.id)
            .order('name')
            .range(from, to);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            allContacts = [...allContacts, ...data];
            page++;
            
            // If we got fewer records than the page size, we've reached the end
            hasMore = data.length === PAGE_SIZE;
          } else {
            hasMore = false;
          }
        }
        
        return allContacts;
      };
      
      const allContacts = await fetchAllContacts();
      console.log(`Fetched ${allContacts.length} total contacts for matching`);
      
      return allContacts.map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: !!session?.user?.id
  });

  // Create a contacts map for efficient lookup by ID
  const contactsMap: ContactsMap = useMemo(() => {
    const map = new Map<string, Contact>();
    contactsData.forEach(contact => {
      if (contact && contact.id) {
        map.set(contact.id, contact);
      }
    });
    return map;
  }, [contactsData]);

  // For backward compatibility and where array operations are needed
  const contacts = useMemo(() => Array.from(contactsMap.values()), [contactsMap]);

  // Helper function to parse time string and convert to 24-hour format
  const parseTimeString = (timeString: string): { hours: number, minutes: number } => {
    const timeRegex = /(\d{1,2})(?::(\d{2}))?(?:\s*([AP]M))?/i;
    const timeMatch = timeString.match(timeRegex);
    
    if (!timeMatch) {
      console.warn('Invalid time format:', timeString);
      return { hours: 18, minutes: 0 }; // Default to 6:00 PM
    }
    
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const isPM = timeMatch[3] && timeMatch[3].toUpperCase().includes('PM');
    
    // Convert to 24-hour format
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    
    return { hours, minutes };
  };

  // Helper function to create a date object from date and time
  const createDateFromDateAndTime = (dateObj: Date, timeString: string): { startDate: Date, endDate: Date } => {
    const { hours, minutes } = parseTimeString(timeString);
    
    const startDate = new Date(dateObj);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2); // Default to 2 hour events
    
    return { startDate, endDate };
  };

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
      console.log('close contacts', data);
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

  const getPromptForField = (field: 'contacts' | 'activity' | 'datetime' | 'location'): string => {
    const contactsStr = selectedContacts.length > 0 ? selectedContacts.map(c => c.name).join(', ') : '';
    const activityStr = activity || '';
    const locationStr = location || '';
    const timeStr = selectedDate && selectedTime ? 
      `${format(selectedDate, 'PPP')} at ${selectedTime}` : '';
    
    // Create a context object with the current state of the planning form
    const context = {
      currentState: {
        contacts: selectedContacts.map(c => c.name).join(', '),
        activity: activityStr,
        location: locationStr,
        datetime: timeStr
      },
      fieldToGenerate: field
    };

    switch (field) {
      case 'contacts':
        return `I'm planning a hangout and need suggestions for who to invite. ${contactsStr ? `I've already selected: ${contactsStr}.` : ''} ${activityStr ? `We'll be doing: ${activityStr}.` : ''} ${locationStr ? `At: ${locationStr}.` : ''} ${timeStr ? `On: ${timeStr}.` : ''} Please suggest ONE contact to invite from my close contacts. I'm sending you my closest contacts in the contactInfo field. Return a JSON with 'text' for your conversational message and 'contacts' array with ONLY the suggested contact's name or ID.`;
      case 'activity':
        return `I'm planning a hangout and need activity suggestions. ${contactsStr ? `With: ${contactsStr}.` : ''} ${activityStr ? `Current activity idea: ${activityStr}.` : ''} ${locationStr ? `At: ${locationStr}.` : ''} ${timeStr ? `On: ${timeStr}.` : ''} Please suggest an activity. Return a JSON with 'text' for your message and 'activity' for your suggestion.`;
      case 'location':
        return `I'm planning a hangout and need location suggestions. ${contactsStr ? `With: ${contactsStr}.` : ''} ${activityStr ? `Activity: ${activityStr}.` : ''} ${locationStr ? `Current location idea: ${locationStr}.` : ''} ${timeStr ? `On: ${timeStr}.` : ''} Please suggest a location. Return a JSON with 'text' for your message and 'location' for your suggestion.`;
      case 'datetime':
        return `I'm planning a hangout and need date/time suggestions. ${contactsStr ? `With: ${contactsStr}.` : ''} ${activityStr ? `Activity: ${activityStr}.` : ''} ${locationStr ? `At: ${locationStr}.` : ''} ${timeStr ? `Current time idea: ${timeStr}.` : ''} Please suggest a date and time. Return a JSON with 'text' for your message and 'datetime' object with 'date' in YYYY-MM-DD format and 'time' in 12-hour format with AM/PM.`;
      default:
        return '';
    }
  };

  const matchAndSetContacts = (responseContacts: any): boolean => {
    // Ensure contacts is an array
    let contactsArray = Array.isArray(responseContacts) ? responseContacts : 
                         (typeof responseContacts === 'string' ? [responseContacts] : []);
    
    if (!Array.isArray(contactsArray) || contactsArray.length === 0) {
      console.warn('Invalid contacts format or empty contacts array:', responseContacts);
      return false;
    }
    
    // Extract contact IDs from the response
    const contactIds = contactsArray
      .filter(contact => contact && (
        (typeof contact === 'object' && contact.id) || 
        typeof contact === 'string'
      ))
      .map(contact => {
        if (typeof contact === 'object' && contact.id) {
          return contact.id;
        } else if (typeof contact === 'string') {
          // Try to find by name match
          const nameMatch = contacts.find(c => 
            c.name.toLowerCase() === contact.toLowerCase()
          );
          return nameMatch?.id;
        }
        return null;
      })
      .filter(Boolean) as string[];
    
    if (contactIds.length === 0) {
      console.warn('No valid contact IDs found in the response');
      return false;
    }
    
    // Match contacts by ID using the contactsMap for efficient lookup
    const newContacts = contactIds
      .map(id => contactsMap.get(id))
      .filter(Boolean) as Contact[];
    
    if (newContacts.length === 0) {
      console.warn('No contacts were matched from the AI response');
      return false;
    }
    
    // Create a Set of existing contact IDs for efficient lookup
    const existingContactIds = new Set(selectedContacts.map(contact => contact.id));
    
    // Filter out contacts that are already selected
    const contactsToAdd = newContacts.filter(contact => !existingContactIds.has(contact.id));
    
    if (contactsToAdd.length === 0) {
      console.log('All suggested contacts are already selected');
      return false;
    }
    
    // Combine existing contacts with new ones
    const combinedContacts = [...selectedContacts, ...contactsToAdd];
    
    console.log('Adding new contacts to selection:', 
      contactsToAdd.map(c => ({ id: c.id, name: c.name })));
    console.log('Combined contacts:', 
      combinedContacts.map(c => ({ id: c.id, name: c.name })));
    
    setSelectedContacts(combinedContacts);
    return true;
  };

  const handleAskAl = async (field: 'contacts' | 'activity' | 'datetime' | 'location') => {
    if (!session?.user?.id || askingAl) return;
    
    setAskingAl(field);
    try {
      const prompt = getPromptForField(field);
      // Set secretMessage to true to hide the prompt from the user
      // Use the HangPlannerAgent instead of ChitChatAgent
      // Pass only close contacts when requesting contact suggestions to avoid context limits
      const contactsToSend = field === 'contacts' ? closeContacts.slice(0, 10) : [];
      const data = await generateChatResponse(prompt, contactsToSend, true, ConversationType.HANG_PLANNER);
      
      if (data && typeof data === 'object') {
        const response = data.response || data;
        console.log('AI response for field:', field, response);
        
        // Update the form with Al's suggestion
        if (field === 'contacts' && response.contacts) {
          matchAndSetContacts(response.contacts);
        } else if (field === 'activity' && response.activity) {
          setActivity(response.activity);
        } else if (field === 'location' && response.location) {
          setLocation(response.location);
        } else if (field === 'datetime' && response.datetime) {
          try {
            console.log('Processing datetime from AI:', response.datetime);
            
            // Parse the date from YYYY-MM-DD format
            if (response.datetime.date) {
              // Try using date-fns parse first (more robust)
              try {
                const date = parse(response.datetime.date, 'yyyy-MM-dd', new Date());
                if (isValid(date)) {
                  console.log('Successfully parsed date with date-fns:', date);
                  setSelectedDate(date);
                } else {
                  throw new Error('Invalid date from date-fns parse');
                }
              } catch (parseError) {
                // Fallback to manual parsing
                console.log('Falling back to manual date parsing');
                const dateParts = response.datetime.date.split('-');
                if (dateParts.length === 3) {
                  const year = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed in JS Date
                  const day = parseInt(dateParts[2]);
                  const newDate = new Date(year, month, day);
                  if (!isNaN(newDate.getTime())) {
                    console.log('Successfully parsed date manually:', newDate);
                    setSelectedDate(newDate);
                  }
                }
              }
            }
            
            // Set the time if provided
            if (response.datetime.time) {
              console.log('Setting time from AI response:', response.datetime.time);
              
              // Use the helper function to parse the time
              const { hours, minutes } = parseTimeString(response.datetime.time);
              
              // Format time as HH:MM
              const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              console.log('Formatted time for dropdown:', formattedTime);
              setSelectedTime(formattedTime);
            }
          } catch (error) {
            console.error('Error parsing date/time from AI response:', error);
            // Set fallback values
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow);
            setSelectedTime('6:00 PM');
          }
        }
        
        // Update the form state
        if (onUpdate) {
          onUpdate({
            contacts: selectedContacts,
            activity,
            location,
            date: selectedDate,
            time: selectedTime
          });
        }
        
        // Send the AI's response to the chat
        onSubmit("", response.text || "Here's my suggestion.");
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      // Show a user-friendly error message in the chat
      onSubmit("", "Sorry, I couldn't generate a suggestion right now. Please try again later.");
    } finally {
      setAskingAl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!session?.user?.id || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
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

        try {
          // Send user prompt as secret message
          const data = await generateChatResponse(contextMessage, closeContacts, true, ConversationType.HANG_GENERATOR);
  
          if (data && typeof data === 'object') {
            console.log('Received data from HangGenerator:', JSON.stringify(data, null, 2));

            let response = data.response || data;            
            // Check if the response is a string (not JSON)
            if (typeof response === 'string' || (response.text && !response.contacts)) {
              console.log('Response appears to be plain text, attempting to extract JSON');
              // Try to extract JSON from the text
              try {
                // Look for JSON-like structure in the text
                const jsonMatch = response.text?.match(/\{[\s\S]*\}/m);
                if (jsonMatch) {
                  try {
                    const extractedJson = JSON.parse(jsonMatch[0]);
                    console.log('Successfully parsed JSON from text:', extractedJson);
                    // Merge the extracted JSON with the response
                    response = { ...response, ...extractedJson };
                  } catch (e) {
                    console.error('Failed to parse JSON from text:', e);
                  }
                }
              } catch (e) {
                console.error('Error trying to extract JSON from text:', e);
              }
            }
                        
            // Update form with AI suggestions
            let formUpdated = false;
            
            // Check if we have contacts in the response
            if (response.contacts) {              
              formUpdated = matchAndSetContacts(response.contacts);
            }
  
            if (response.activity && !isComplete.activity) {
              setActivity(response.activity);
              formUpdated = true;
            }
  
            if (response.datetime && !isComplete.datetime) {
              const date = parse(response.datetime.date, 'yyyy-MM-dd', new Date());
              if (isValid(date)) {
                setSelectedDate(date);
                console.log('Setting time from AI response:', response.datetime.time);
              
                // Use the helper function to parse the time
                const { hours, minutes } = parseTimeString(response.datetime.time);
                
                // Format time as HH:MM
                const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                console.log('Formatted time for dropdown:', formattedTime);
                setSelectedTime(formattedTime);
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

            onSubmit("", response.text);
          }
        } catch (error) {
          console.error('Error getting AI suggestions:', error);
        }
        return;
      }

      // Convert date and time to UTC
      const { startDate, endDate } = createDateFromDateAndTime(selectedDate, selectedTime);
      
      const event = {
        user_id: session.user.id,
        title: activity,
        description: `Hangout with ${selectedContacts.map(c => c.name).join(', ')}`,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        location: location,
        updated_at: new Date().toISOString()
      };

      // Add event to calendar_events table
      try {
        const { error: eventError } = await supabase
          .from('calendar_events')
          .insert(event);

        if (eventError) {
          console.error('Error creating calendar event:', eventError);
        }
      } catch (error) {
        console.error('Error creating calendar event:', error);
      }

      const dateStr = selectedDate ? format(selectedDate, 'PPP') : '';
      const message = `I just scheduled ${activity} with ${selectedContacts.map(c => c.name).join(', ')} ${
        location ? `at ${location}` : ''
      } on ${dateStr} ${selectedTime}`;
      onSubmit(message);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsSubmitting(false);
    }
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
              <PopoverContent className="p-0 w-[300px]" align="start">
                <Command className="max-h-[300px] overflow-auto">
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
          {/* Contacts Section */}
          <div className={`relative border rounded-lg p-4 pt-6 ${isComplete.contacts ? 'border-purple-500' : ''}`}>
            <div className="absolute top-0 left-4 -translate-y-1/2 bg-white px-2">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="font-medium text-sm">Who's coming?</span>
                {isComplete.contacts && <span className="text-purple-500 ml-1">✓</span>}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
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
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search contacts..."
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  className="flex-1 w-full"
                />
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowContactDialog(true)}
                title="Add new contact"
                type="button"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap border-purple-600 text-purple-600 hover:bg-purple-50"
                onClick={() => handleAskAl('contacts')}
                disabled={askingAl !== null}
              >
                {askingAl === 'contacts' ? (
                  <span>Thinking...</span>
                ) : (
                  <span>Ask Al</span>
                )}
              </Button>
            </div>
            
            {/* Contact dropdown moved below the input field */}
            {contactInput && filteredContacts.length > 0 && (
              <div className="relative z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[300px] overflow-auto">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      handleContactSelect(contact);
                      setContactInput("");
                    }}
                  >
                    {contact.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Section */}
          <div className={`relative border rounded-lg p-4 pt-6 ${isComplete.activity ? 'border-purple-500' : ''}`}>
            <div className="absolute top-0 left-4 -translate-y-1/2 bg-white px-2">
              <div className="flex items-center gap-1">
                <Shuffle className="h-4 w-4" />
                <span className="font-medium text-sm">What do you want to do?</span>
                {isComplete.activity && <span className="text-purple-500 ml-1">✓</span>}
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
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
                  className="flex-1 w-full"
                />
                {activity && 
                  // Only show dropdown if there are matching activities AND none of them is an exact match
                  activities.filter(act => 
                    act.name.toLowerCase().includes(activity.toLowerCase())
                  ).length > 0 && 
                  !activities.some(act => act.name.toLowerCase() === activity.toLowerCase()) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[300px] overflow-auto">
                    {activities
                      .filter(act => 
                        act.name.toLowerCase().includes(activity.toLowerCase())
                      )
                      .map(act => (
                        <div
                          key={act.id}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
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
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap border-purple-600 text-purple-600 hover:bg-purple-50"
                onClick={() => handleAskAl('activity')}
                disabled={askingAl !== null}
              >
                {askingAl === 'activity' ? (
                  <span>Thinking...</span>
                ) : (
                  <span>Ask Al</span>
                )}
              </Button>
            </div>
          </div>

          {/* Date/Time Section */}
          <div className={`relative border rounded-lg p-4 pt-6 ${isComplete.datetime ? 'border-purple-500' : ''}`}>
            <div className="absolute top-0 left-4 -translate-y-1/2 bg-white px-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium text-sm">When?</span>
                {isComplete.datetime && <span className="text-purple-500 ml-1">✓</span>}
              </div>
            </div>
            
            <div className="flex items-end gap-2 mb-2">
              <div className="flex-1">
                <Label className="text-xs">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-9"
                    >
                      {selectedDate ? (
                        format(selectedDate, 'PPP')
                      ) : (
                        <span className="text-muted-foreground">Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="w-32">
                <Label className="text-xs">Time</Label>
                <Select
                  value={selectedTime}
                  onValueChange={(value) => {
                    setSelectedTime(value);
                    if (onUpdate) {
                      onUpdate({
                        contacts: selectedContacts,
                        activity,
                        location,
                        date: selectedDate,
                        time: value
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 * 4 }).map((_, index) => {
                      const hour = Math.floor(index / 4);
                      const minute = (index % 4) * 15;
                      const formattedHour = hour.toString().padStart(2, '0');
                      const formattedMinute = minute.toString().padStart(2, '0');
                      const timeValue = `${formattedHour}:${formattedMinute}`;
                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      const amPm = hour < 12 ? 'AM' : 'PM';
                      const displayTime = `${displayHour}:${formattedMinute.toString().padStart(2, '0')} ${amPm}`;
                      return (
                        <SelectItem key={timeValue} value={timeValue}>
                          {displayTime}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap h-9 border-purple-600 text-purple-600 hover:bg-purple-50"
                onClick={() => handleAskAl('datetime')}
                disabled={askingAl !== null}
              >
                {askingAl === 'datetime' ? (
                  <span>Thinking...</span>
                ) : (
                  <span>Ask Al</span>
                )}
              </Button>
            </div>
            {/* Ask Al button moved inline with date/time fields */}
          </div>

          {/* Location Section */}
          <div className={`relative border rounded-lg p-4 pt-6 ${isComplete.location ? 'border-purple-500' : ''}`}>
            <div className="absolute top-0 left-4 -translate-y-1/2 bg-white px-2">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="font-medium text-sm">Where?</span>
                {isComplete.location && <span className="text-purple-500 ml-1">✓</span>}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (onUpdate) {
                    onUpdate({
                      contacts: selectedContacts,
                      activity,
                      location: e.target.value,
                      date: selectedDate,
                      time: selectedTime
                    });
                  }
                }}
                placeholder="e.g. Central Park, Joe's Coffee, etc."
                className="flex-1"
              />
              
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap border-purple-600 text-purple-600 hover:bg-purple-50"
                onClick={() => handleAskAl('location')}
                disabled={askingAl !== null}
              >
                {askingAl === 'location' ? (
                  <span>Thinking...</span>
                ) : (
                  <span>Ask Al</span>
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSubmitting || askingAl !== null}
            >
              {isSubmitting 
                ? "Planning..." 
                : !isComplete.contacts && !isComplete.activity && !isComplete.datetime && !isComplete.location
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

      {/* Add ContactsDialog at the main level so it works from any section */}
      <ContactsDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        onSubmit={handleNewContactSubmit}
        userId={session?.user?.id || ""}
      />
    </div>
  );
};
