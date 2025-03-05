import { Agent } from './base.ts';
import { Contact } from '../types.ts';
import { searchGooglePlaces } from '../utils.ts';
import { functions } from '../types.ts';

export class HangPlannerAgent extends Agent {
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
  protected systemPrompt = `You are helping the user plan a hangout step by step. The steps you will go through are as follows:
  - Ask the user what they would like to do with the mentioned friend
  - Based on the user's response, ask where they would like to meet the friend. Provide a place suggestion from searchGooglePlaces
  - Ask the user when they would like to meet the friend. Always include the phrase "Pick a date and time"

  Do not move on to the next step until the user has answered the previous step.
  
  As you collect all of this information, return a JSON with the following structure:
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
  5. Always check that the date you suggest is valid and in the future
    
  When all of the steps are complete, and you have filled in the json response, confirm with the user that their event is in the calendar.
`

  async chat(
    userId: string,
    message: string,
    contactInfo?: Contact[],
    secretMessage?: boolean
  ): Promise<{ parsedResponse: any }> {
    // Get user profile for context
    const profile = await this.getUserProfile(userId);
    const profileData = this.filterUserProfile(profile);
    
    const chatHistory = await this.getChatHistory(userId);

    const messages = chatHistory?.map(msg => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.message
    })) || [];

    // Build context for the AI
    const now = new Date();
    const context = {
      user: profileData,
      contacts: contactInfo || [],
      currentTime: {
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    messages.push({role: 'user', content: `Context: ${JSON.stringify(context, null, 2)}\nMessage: ${message}`})

    this.saveChatMessage(userId, message, secretMessage, false);

    // Prepare messages for the AI
    messages.unshift({
      role: 'system',
      content: this.systemPrompt
    })

    const findPlaceFunction = functions.find(func => func.function.name === 'searchGooglePlaces');

    // Get response from OpenAI
    const response = await this.callOpenAI(messages, [findPlaceFunction]);
    const responseData = await response.json();
    let aiResponse = responseData.choices[0].message.content;

    let parsedResponse;
    if (responseData.choices[0].message.tool_calls) {
      messages.push(responseData.choices[0].message);
      for (const toolCall of responseData.choices[0].message.tool_calls) {
        console.log(toolCall);
        
        if (toolCall.function.name === 'searchGooglePlaces') {
          const args = JSON.parse(toolCall.function.arguments);
          try {
            if (!args.location) {
              args.location = profile.city;
            }
            const placeResult = await searchGooglePlaces(args.searchString, args.location);
            
            // Send the place result back to GPT for a natural response
            messages.push(
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(placeResult) }
            );
          } catch (error) {
            console.error('Error calling Google Places API:', error);
            messages.push(
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ error: 'Failed to search places' }) }
            );
          }
        }
      }
      
      // After processing all tool calls, get the final response
      const finalResponse = await this.callOpenAI(messages);
      const finalData = await finalResponse.json();
      try {
        parsedResponse = JSON.parse(finalData.choices[0].message.content);
        console.log('Successfully parsed tool response as JSON');
      } catch (e) {
        console.warn('Failed to parse tool response as JSON:', e);
        parsedResponse = extractJsonFromText(finalData.choices[0].message.content);
      }
    } else {
      try {
        parsedResponse = JSON.parse(aiResponse);
        console.log('Successfully parsed direct response as JSON');
      } catch (error) {
        console.warn('Error parsing AI response as JSON:', error);
        parsedResponse = extractJsonFromText(aiResponse);
      }
    }
    
    // Helper function to extract JSON from text
    function extractJsonFromText(text) {
      console.log('Attempting to extract JSON from text:', text);
      // Default response if we can't extract JSON
      const defaultResponse = {
        text: text,
        contacts: [],
      };
      
      // Try to extract JSON from the text
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/m);
        if (jsonMatch) {
          console.log('Found potential JSON in text:', jsonMatch[0]);
          try {
            const extractedJson = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from text:', extractedJson);
            // Merge the extracted JSON with the response
            return { ...defaultResponse, ...extractedJson };
          } catch (e) {
            console.error('Failed to parse JSON from text match:', e);
          }
        }
      } catch (e) {
        console.error('Error trying to extract JSON from text:', e);
      }
      
      return defaultResponse;
    }
    
    console.log('Raw AI response before formatting:', parsedResponse);
    console.log('Raw contacts before formatting:', parsedResponse.contacts);
    console.log('Available contacts for matching:', contactInfo);
    
    // Ensure contacts are properly formatted
    parsedResponse = this.ensureProperContactFormat(parsedResponse, contactInfo || []);
    
    console.log('Formatted response with contacts:', parsedResponse);
    console.log('Final formatted contacts:', parsedResponse.contacts);

    if (parsedResponse.text) {
      this.saveChatMessage(userId, parsedResponse.text, secretMessage, true);
    }
    return { parsedResponse };
  }
}
