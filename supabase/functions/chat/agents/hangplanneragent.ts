import { Agent } from './base.ts';
import { Contact } from '../types.ts';
import { searchGooglePlaces, ensureProperContactFormat, extractJsonFromText } from '../utils.ts';
import { functions } from '../types.ts';
import { filterJSON } from '../../_shared/utils.ts';

export class HangPlannerAgent extends Agent {

  protected systemPrompt = `You are helping the user plan a hangout step by step. The steps you will go through are as follows:
  - Ask the user what they would like to do with the mentioned friend
  - Based on the user's response, ask where they would like to meet the friend. Provide a place suggestion from searchGooglePlaces
  - Ask the user when they would like to meet the friend. Always include the phrase "Pick a date and time"
  - When you suggest an activity, suggest one that the user has not already scheduled.
  - When you suggest contacts to attend the hang, prefer contacts that the user has not already scheduled.
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
    const events = await this.getEvents(userId, profile.utc_offset_minutes);

    const chatHistory = await this.getChatHistory(userId);

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

    const messages = chatHistory?.map(msg => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.message
    })) || [];

    // Build context for the AI
    const now = new Date();
    const context = {
      user: profileData,
      contacts: filteredContacts || [],
      events: filteredEvents,
      currentTime: {
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    messages.push({role: 'user', content: `Context: ${JSON.stringify(context, null, 2)}\nMessage: ${message}`})

    this.saveChatMessage(userId, message, true, false);

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
      if (typeof finalData.choices[0].message.content === 'string') {
        const text = finalData.choices[0].message.content;
        parsedResponse = extractJsonFromText(text);
      } else {
        console.log('Response is not a string:', finalData.choices[0].message.content);
        const defaultResponse = {
          text: '',
          contacts: [],
        };
        parsedResponse = defaultResponse;
      }
    } else {
      if (typeof aiResponse === 'string') {
        parsedResponse = extractJsonFromText(aiResponse);
      } else {
        console.log('Response is not a string:', aiResponse);
        const defaultResponse = {
          text: '',
          contacts: [],
        };
        parsedResponse = defaultResponse;
      }
    }
    
    // Ensure contacts are properly formatted
    parsedResponse = ensureProperContactFormat(parsedResponse, contactInfo || []);
    
    console.log('Formatted response with contacts:', parsedResponse);

    if (parsedResponse.text) {
      this.saveChatMessage(userId, parsedResponse.text, true, true);
    }
    return { parsedResponse };
  }
}
