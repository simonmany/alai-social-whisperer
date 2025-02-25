import { Agent } from './base.ts';
import { Contact } from '../types.ts';
import { filterJSON } from '../../_shared/utils.ts';

export class HangGeneratorAgent extends Agent {
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
      "contacts": [{id: string, name: string}],
      "activity": the activity the user and their friend will be doing,
      "datetime": {
        "date": the date in YYYY-MM-DD format (e.g. 2025-02-24),
        "time": the time in 12-hour format with AM/PM (e.g. 2:30 PM)
      },
      "location": the location the hangout will take place at,
    }
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
    const parsedResponse = JSON.parse(data.choices[0].message.content);

    if (parsedResponse.text) {
        this.saveChatMessage(userId, parsedResponse.text, secretMessage, true);
    }
    return { parsedResponse };
  }
}