import { Agent } from './base.ts';
import { Contact } from '../types.ts';
import { filterJSON } from '../../_shared/utils.ts';

export class HangGeneratorAgent extends Agent {
  // Helper function to ensure contacts are properly formatted - using ONLY exact contact IDs
  private ensureProperContactFormat(response: any, availableContacts: Contact[]): any {
    if (!response) return response;
    
    // Create a copy of the response to avoid modifying the original
    const formattedResponse = { ...response };
    
    // Check if contacts exist in the response
    if (!formattedResponse.contacts) {
      formattedResponse.contacts = [];
      console.log('No contacts in response, using empty array');
    }
    
    // Ensure contacts is an array
    if (!Array.isArray(formattedResponse.contacts)) {
      if (typeof formattedResponse.contacts === 'object' && formattedResponse.contacts !== null) {
        // If it's a single object, wrap it in an array
        formattedResponse.contacts = [formattedResponse.contacts];
        console.log('Converted single contact object to array:', formattedResponse.contacts);
      } else {
        // Default to empty array for any other case
        formattedResponse.contacts = [];
        console.log('Invalid contacts format, using empty array');
      }
    }
    
    console.log('Processing contacts array with', formattedResponse.contacts.length, 'items');
    formattedResponse.contacts.forEach((contact: any, index: number) => {
      console.log(`Contact ${index}:`, contact);
    });
    
    // Process each contact to ensure it has id and name
    // ONLY match by exact contact ID, no name matching
    formattedResponse.contacts = formattedResponse.contacts.map((contact: any, index: number) => {
      console.log(`Processing contact ${index}:`, contact);
      
      if (typeof contact === 'object' && contact !== null && contact.id) {
        // If it has an id, try to find the contact by exact ID match
        console.log(`Looking for contact with ID: ${contact.id}`);
        const match = availableContacts.find(c => c.id === contact.id);
        
        if (match) {
          console.log(`Found match for ID ${contact.id}: ${match.name}`);
          return { id: match.id, name: match.name };
        } else {
          console.log(`No match found for ID ${contact.id}`);
        }
      } else {
        console.log(`Contact ${index} has no ID or is not an object:`, contact);
      }
      
      // If no ID match, return null (will be filtered out)
      return null;
    }).filter(Boolean); // Remove null entries
    
    console.log('Contacts after ID-only matching:', formattedResponse.contacts);
    console.log('Number of contacts after filtering:', formattedResponse.contacts.length);
    
    // If we don't have any valid contacts, suggest the first contact from available contacts
    // This is just a fallback to ensure we have at least one contact
    if (formattedResponse.contacts.length === 0 && availableContacts.length > 0) {
      const suggestedContact = availableContacts[0];
      formattedResponse.contacts = [{ id: suggestedContact.id, name: suggestedContact.name }];
      
      // Update the text to mention we're suggesting a contact
      if (formattedResponse.text) {
        formattedResponse.text += `

I've suggested inviting ${suggestedContact.name} to this hangout.`;
      }
      
      console.log('No valid contacts found, suggesting fallback contact:', suggestedContact.name);
    }
    
    return formattedResponse;
  }
  protected systemPrompt = `You are helping the user plan a hangout with their friends. 
    Try to suggest an activity that they will enjoy based on their profile and friends' profiles.
    Always provide a conversational response explaining your suggestions. 
    If there are not any attendees listed, select some contacts from the contacts list to suggest.
    Prefer days when there is not already an event.
    When you suggest a date, check the listed events to make sure the user doesn't have something else scheduled for the same time.
    When you suggest a date, check to make sure it's the same date in your text response and the datetime object.
    Format the suggestions at the end as JSON. The structure of your response should be:
    {
      "text": your conversational response,
      "contacts": [
        { "id": "contact-id-1", "name": "Contact Name 1" }, 
        { "id": "contact-id-2", "name": "Contact Name 2" }
      ],
      "activity": the activity the user and their friend will be doing,
      "datetime": {
        "date": the date in YYYY-MM-DD format (e.g. 2025-02-24),
        "time": the time in 12-hour format with AM/PM (e.g. 2:30 PM)
      },
      "location": the location the hangout will take place at,
    }
    
    CRITICAL CONTACT RULES - FOLLOW THESE EXACTLY:
    1. ALWAYS include contacts as an ARRAY of OBJECTS with "id" and "name" properties
    2. NEVER include contacts as strings or any other format
    3. ALWAYS include at least one contact in the array
    4. If suggesting multiple contacts, include ALL of them in the contacts array
    5. Make sure each contact has both an "id" and a "name" property
    6. ALWAYS use the EXACT contact IDs from the provided contacts list
    7. DO NOT make up contact IDs - only use IDs from the contacts list
    8. The "contacts" field MUST be an array, even if there's only one contact
    
    IMPORTANT DATE RULES:
    1. ALWAYS use YYYY-MM-DD format for dates (e.g. 2025-02-24)
    2. NEVER use relative dates like "next Friday" or "tomorrow"
    3. ALWAYS use 12-hour time format with AM/PM (e.g. 2:30 PM)
    4. Only suggest dates within the next 7 days
    5. Always check that the date you suggest is valid and in the future`
  async chat(
    userId: string,
    message: string,
    contactInfo?: Contact[],
    secretMessage?: boolean
  ): Promise<{ parsedResponse: any }> {
    // Get user profile and events for context
    const profile = await this.getUserProfile(userId);
    const profileData = this.filterUserProfile(profile);
    const events = await this.getEvents(userId, profile.utc_offset_minutes);

    this.saveChatMessage(userId, message, true, false);
    
    // Format events for better readability
    const formattedEvents = events.map(event => ({
      ...event,
      start_time: new Date(event.start_time).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      end_time: new Date(event.end_time).toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }));

    // Filter events to include only necessary fields
    const filteredEvents = formattedEvents.map(event => ({
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location
    }));

    const filteredContacts = filterJSON(contactInfo);

    // Build context for the AI
    const context = {
      user: profileData,
      events: filteredEvents,
      contacts: filteredContacts
    };

    // Prepare messages for the AI
    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `Context: ${JSON.stringify(context, null, 2)}\n\nUser request: ${message}` }
    ];

    // Get response from OpenAI
    const response = await this.callOpenAI(messages);
    const data = await response.json();
    
    console.log('Raw OpenAI response content:', data.choices[0].message.content);
    
    // Try to parse the response as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(data.choices[0].message.content);
      console.log('Successfully parsed response as JSON');
    } catch (e) {
      console.warn('Failed to parse response as JSON, using text format:', e);
      // If parsing fails, use the raw text
      parsedResponse = {
        text: data.choices[0].message.content,
        contacts: []
      };
      
      // Try to extract JSON from the text
      try {
        const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/m);
        if (jsonMatch) {
          console.log('Found potential JSON in text:', jsonMatch[0]);
          try {
            const extractedJson = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from text:', extractedJson);
            // Merge the extracted JSON with the response
            parsedResponse = { ...parsedResponse, ...extractedJson };
          } catch (e) {
            console.error('Failed to parse JSON from text match:', e);
          }
        }
      } catch (e) {
        console.error('Error trying to extract JSON from text:', e);
      }
    }
    
    console.log('Processed AI response:', parsedResponse);
    console.log('Raw contacts before formatting:', parsedResponse.contacts);
    console.log('Available contacts for matching:', filteredContacts);
    
    // Ensure contacts are properly formatted
    parsedResponse = this.ensureProperContactFormat(parsedResponse, filteredContacts);
    
    console.log('Formatted response with contacts:', parsedResponse);
    console.log('Final formatted contacts:', parsedResponse.contacts);

    if (parsedResponse.text) {
        this.saveChatMessage(userId, parsedResponse.text, secretMessage, true);
    }
    return { parsedResponse };
  }
}