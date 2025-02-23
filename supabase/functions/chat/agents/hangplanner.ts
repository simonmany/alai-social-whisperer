import { Agent } from './base.ts';
import { Contact } from '../types.ts';

export class HangPlannerAgent extends Agent {
  protected systemPrompt = `You are helping the user plan a hangout with their friends. 
    Always provide a conversational response explaining your suggestions. 
    If there are not any attendees listed, select some contacts from the contacts list to suggest.
    Prefer days when there is not already an event.
    When you suggest a date, check to make sure it's the same date in your text response and the datetime object.
    Additionally, format the suggestions at the end as JSON. The structure of your response should be:
    {
        "text": "Your explanation for your selections and choices here",
        "contacts": [...],
        "activity": "string",
        "datetime": {
            "date": "string formatted as: Month day, year",
            "time": "string, using the 12 hour clock"
        }
    }`
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

    this.saveChatMessage(userId, message, secretMessage, false);
    
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

    // Build context for the AI
    const context = {
      user: profileData,
      events: filteredEvents,
      contacts: contactInfo || []
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