import { useState, useCallback } from "react";
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

  const { data: contacts = [] } = useQuery({
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

  const handleAskAl = async (field: 'contacts' | 'activity' | 'datetime' | 'location') => {
    if (!session?.user?.id || askingAl) return;
    
    setAskingAl(field);
    try {
      const prompt = getPromptForField(field);
      // Set secretMessage to true to hide the prompt from the user
      // Use the HangPlannerAgent instead of ChitChatAgent
      // Pass only close contacts when requesting contact suggestions to avoid context limits
      const contactsToSend = field === 'contacts' ? closeContacts.slice(0, 10) : [];
      console.log(`Sending ${contactsToSend.length} close contacts to AI for suggestions`);
      const data = await generateChatResponse(prompt, contactsToSend, true, ConversationType.HANG_PLANNER);
      
      if (data && typeof data === 'object') {
        const response = data.response || data;
        console.log('AI response for field:', field, response);
        
        // Update the form with Al's suggestion
        if (field === 'contacts' && response.contacts) {
          console.log('Processing contacts suggestion:', response.contacts);
          
          // Handle different formats of contacts from the AI
          let contactNames: string[] = [];
          let contactIds: string[] = [];
          
          if (Array.isArray(response.contacts)) {
            // Extract contact info from the response
            response.contacts.forEach((contact: any) => {
              if (typeof contact === 'string') {
                contactNames.push(contact);
              } else if (typeof contact === 'object') {
                if (contact.id) contactIds.push(contact.id);
                if (contact.name) contactNames.push(contact.name);
              }
            });
          } else if (typeof response.contacts === 'string') {
            // Handle case where contacts might be a comma-separated string
            contactNames = response.contacts.split(',').map(name => name.trim());
          }
          
          console.log('Extracted contact names:', contactNames);
          console.log('Extracted contact IDs:', contactIds);
          
          // If we have a text response from AI, extract names from it
          if (response.text && typeof response.text === 'string') {
            // Look for names in the AI's text response
            const nameRegex = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
            const namesInText = response.text.match(nameRegex) || [];
            if (namesInText.length > 0) {
              console.log('Found names in AI text response:', namesInText);
              contactNames = [...contactNames, ...namesInText];
            }
          }
          
          // Try to find matches by ID first from all contacts
          let suggestedContacts = contacts.filter(c => contactIds.includes(c.id));
          
          // If no ID matches, try exact name matches from all contacts
          if (suggestedContacts.length === 0) {
            suggestedContacts = contacts.filter(c => 
              contactNames.some(name => c.name.toLowerCase() === name.toLowerCase())
            );
          }
          
          // If still no matches, try partial name matches from all contacts
          if (suggestedContacts.length === 0) {
            suggestedContacts = contacts.filter(c => 
              contactNames.some(name => 
                c.name.toLowerCase().includes(name.toLowerCase()) || 
                name.toLowerCase().includes(c.name.toLowerCase())
              )
            );
          }
          
          console.log('Found matching contacts:', suggestedContacts);
          
          if (suggestedContacts.length) {
            // Take just the first suggested contact if there are multiple
            const contactToAdd = suggestedContacts[0];
            
            // Only add if not already selected
            if (!selectedContacts.some(c => c.id === contactToAdd.id)) {
              console.log('Adding contact to selection:', contactToAdd);
              setSelectedContacts([...selectedContacts, contactToAdd]);
            } else {
              console.log('Contact already selected:', contactToAdd);
            }
          } else {
            console.log('No matching contacts found, trying more aggressive matching');
            
            // Try more aggressive matching - look for any partial match in either direction
            for (const name of contactNames) {
              // Find any contact that contains part of the name or vice versa
              const possibleMatches = contacts.filter(c => 
                c.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) || // First name match
                c.name.toLowerCase().includes(name.toLowerCase().split(' ').pop() || '') || // Last name match
                name.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]) || // AI name contains contact first name
                name.toLowerCase().includes(c.name.toLowerCase().split(' ').pop() || '') // AI name contains contact last name
              );
              
              if (possibleMatches.length > 0) {
                console.log(`Found possible matches for '${name}':`, possibleMatches);
                const contactToAdd = possibleMatches[0];
                
                if (!selectedContacts.some(c => c.id === contactToAdd.id)) {
                  console.log('Adding best match contact to selection:', contactToAdd);
                  setSelectedContacts([...selectedContacts, contactToAdd]);
                  return; // Exit after adding one contact
                }
              }
            }
            
            console.log('No matching contacts found even with aggressive matching');
          }
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
              
              // Parse the time string to extract hours, minutes, and AM/PM
              const timeRegex = /(\d{1,2})(?::(\d{2}))?(\s*[AP]M)?/i;
              const timeMatch = response.datetime.time.match(timeRegex);
              
              if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const isPM = timeMatch[3] && timeMatch[3].toUpperCase().includes('PM');
                
                // Convert to 24-hour format
                if (isPM && hours < 12) hours += 12;
                if (!isPM && hours === 12) hours = 0;
                
                // Format time as HH:MM
                const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                console.log('Formatted time for dropdown:', formattedTime);
                setSelectedTime(formattedTime);
              } else {
                // If we can't parse the time, just use it as is
                setSelectedTime(response.datetime.time);
              }
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
        onSubmit("", response.text || response.message || "Here's my suggestion.");
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      // Show a user-friendly error message in the chat
      onSubmit("", "Sorry, I couldn't generate a suggestion right now. Please try again later.");
    } finally {
      setAskingAl(null);
    }
  };

  const handleSubmit = async () => {
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
            console.log('Processing response:', JSON.stringify(response, null, 2));
            
            // Check if the response is a string (not JSON)
            if (typeof response === 'string' || (response.text && !response.contacts)) {
              console.log('Response appears to be plain text, attempting to extract JSON');
              // Try to extract JSON from the text
              try {
                // Look for JSON-like structure in the text
                const jsonMatch = response.text?.match(/\{[\s\S]*\}/m);
                if (jsonMatch) {
                  console.log('Found potential JSON in text:', jsonMatch[0]);
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
            
            console.log('Final processed response:', JSON.stringify(response, null, 2));
            console.log('Response contacts (raw):', response.contacts);
            
            // Update form with AI suggestions
            let formUpdated = false;
            
            // Check if we have contacts in the response
            if (response.contacts) {
              console.log('Raw contacts from HangGenerator:', response.contacts);
              
              // Try to extract contacts from text if no structured contacts
              if (response.text && (!response.contacts.length || !Array.isArray(response.contacts))) {
                console.log('Trying to extract contacts from text:', response.text);
                // Look for names in the AI's text response
                const nameRegex = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
                const namesInText = response.text.match(nameRegex) || [];
                if (namesInText.length > 0) {
                  console.log('Found names in AI text response:', namesInText);
                  response.contacts = namesInText.map(name => ({ name }));
                }
              }
              
              // Ensure contacts is an array
              const contactsArray = Array.isArray(response.contacts) ? response.contacts : 
                                   (typeof response.contacts === 'string' ? [response.contacts] : []);
              
              console.log('Normalized contacts array:', contactsArray);
              
              // Extract contact IDs from the response - ONLY use IDs, no name matching
              let contactIds: string[] = [];
              
              // Ensure we're dealing with an array
              if (!Array.isArray(response.contacts)) {
                console.warn('Response contacts is not an array:', response.contacts);
                if (response.contacts && typeof response.contacts === 'object') {
                  // Single object case
                  contactsArray = [response.contacts];
                } else {
                  contactsArray = [];
                }
              }
              
              console.log('Processing contacts array:', JSON.stringify(contactsArray, null, 2));
              
              // Extract IDs from each contact object
              contactsArray.forEach((contact: any, index: number) => {
                console.log(`Processing contact ${index}:`, contact);
                if (typeof contact === 'object' && contact !== null) {
                  if (contact.id) {
                    console.log(`Found contact ID: ${contact.id} for ${contact.name || 'unnamed contact'}`);
                    contactIds.push(contact.id);
                  } else if (contact.name) {
                    // Try to find a matching contact by name as a fallback
                    console.warn('Contact object has no ID but has name:', contact.name);
                    const nameMatch = contacts.find(c => 
                      c.name.toLowerCase() === contact.name.toLowerCase()
                    );
                    if (nameMatch) {
                      console.log(`Found contact by name match: ${nameMatch.id} (${nameMatch.name})`);
                      contactIds.push(nameMatch.id);
                    } else {
                      console.warn(`No contact found with name: ${contact.name}`);
                    }
                  } else {
                    console.warn('Contact object has no ID or name:', contact);
                  }
                } else if (typeof contact === 'string') {
                  console.warn('Contact is a string, not an object with ID:', contact);
                  // Try to find a matching contact by name as a fallback
                  const nameMatch = contacts.find(c => 
                    c.name.toLowerCase() === contact.toLowerCase()
                  );
                  if (nameMatch) {
                    console.log(`Found contact by string name match: ${nameMatch.id} (${nameMatch.name})`);
                    contactIds.push(nameMatch.id);
                  }
                }
              });
              
              console.log('Extracted contact IDs:', contactIds);
              console.log(`Available contacts for matching: ${contacts.length} total contacts`);
              
              // Function to match contacts by ID against ALL available contacts
              // Optimized for performance with large contact lists
              const matchContactsById = (contactIds: string[], allContacts: Contact[]) => {
                console.log(`Matching ${contactIds.length} contact IDs against ${allContacts.length} total contacts`);
                
                // Early exit if no contacts to match
                if (contactIds.length === 0 || allContacts.length === 0) {
                  console.log('No contacts to match or no available contacts');
                  return [];
                }
                
                // Create a map for faster lookup - O(n) operation once
                const contactMap = new Map<string, Contact>();
                allContacts.forEach(contact => {
                  if (contact && contact.id) {
                    contactMap.set(contact.id, contact);
                  }
                });
                
                console.log(`Created contact map with ${contactMap.size} entries`);
                
                // Match each contact ID - O(m) where m is the number of IDs to match
                const matchedContacts: Contact[] = [];
                let matchCount = 0;
                
                // Use a Set for faster lookups when checking for duplicates
                const addedIds = new Set<string>();
                
                contactIds.forEach(id => {
                  // Skip if we've already added this ID
                  if (addedIds.has(id)) return;
                  
                  const match = contactMap.get(id);
                  if (match) {
                    matchCount++;
                    addedIds.add(id);
                    matchedContacts.push(match);
                  } else {
                    console.warn(`✗ No match found for contact ID ${id}`);
                  }
                });
                
                console.log(`Successfully matched ${matchCount} out of ${contactIds.length} contact IDs`);
                return matchedContacts;
              };
              
              // Find matches by ID ONLY - exact matching against ALL contacts
              let suggestedContacts = matchContactsById(contactIds, contacts);
              console.log('Contacts matched by ID:', suggestedContacts.map(c => ({ id: c.id, name: c.name })));
              
              console.log('All matched contacts:', suggestedContacts);
              
              if (suggestedContacts.length) {
                // Only add valid contacts that exist in the database
                const validContacts = suggestedContacts.filter(c => 
                  c && c.id && c.name
                );
                
                console.log('Valid contacts after filtering:', validContacts.map(c => ({ id: c.id, name: c.name })));
                
                if (validContacts.length) {
                  console.log('Setting ALL matched contacts to selection:', validContacts.map(c => ({ id: c.id, name: c.name })));
                  // Replace the current selection with all suggested contacts
                  // This ensures we get all contacts suggested by the AI
                  setSelectedContacts(validContacts);
                  formUpdated = true;
                } else {
                  console.log('No valid contacts to add');
                }
              } else {
                console.warn('No contacts were matched from the AI response');
                
                // If we have contact IDs but no matches, log this for debugging
                if (contactIds.length > 0) {
                  console.warn(`Had ${contactIds.length} contact IDs but no matches were found:`, contactIds);
                  console.warn(`Available contacts count: ${contacts.length}`);
                  
                  // Sample the first 10 contacts to check if they're properly loaded
                  const sampleContacts = contacts.slice(0, 10);
                  console.log('Sample of available contacts:', sampleContacts.map(c => ({ id: c.id, name: c.name })));
                  
                  // Check if the contact IDs exist in the database at all
                  contactIds.forEach(id => {
                    const exists = contacts.some(c => c.id === id);
                    console.warn(`Contact ID ${id} exists in database: ${exists}`);
                    
                    // If not found by ID, try to find a similar contact by ID pattern
                    if (!exists) {
                      const similarContacts = contacts.filter(c => c.id && c.id.includes(id.substring(0, 8)));
                      if (similarContacts.length > 0) {
                        console.warn(`Found ${similarContacts.length} contacts with similar ID pattern to ${id}:`, 
                          similarContacts.map(c => ({ id: c.id, name: c.name })));
                      }
                    }
                  });
                }
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

            onSubmit("", response.text);
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
