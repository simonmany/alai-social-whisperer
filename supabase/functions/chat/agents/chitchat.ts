import { Agent } from './base.ts';
import { Contact, functions } from '../types.ts';
import { extractNamesFromText, searchContactsByNames, upsertContacts, searchGooglePlaces, findFriendsForActivity, mergeContacts, upsertContactGroups } from '../utils.ts';

export class ChitChatAgent extends Agent {
  protected systemPrompt = ``

  private constructSystemPrompt(profile: any, events: any) {
    // Format events to be more readable
    const formattedEvents = events.map((event: any) => ({
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
  
    return `You are Al, a friendly and helpful social life assistant. You have access to the following user data:
        - Profile: ${JSON.stringify(profile, null, 2)}
        - Calendar Events for the next 10 days: ${JSON.stringify(formattedEvents, null, 2)}
        
        If asked about the calendar or scheduling, you can:
        - List upcoming events
        - Suggest free time slots for new activities
        - Help identify scheduling conflicts
        - Provide summaries of the user's schedule
        
        When suggesting times for activities:
        1. Check the existing calendar events to avoid conflicts
        2. Suggest specific dates and times that work around existing commitments
        3. Consider typical timing for the suggested activity (e.g., dinner in the evening)
  
        When users mention meeting someone new or talk about a contact:
        1. Extract the person's name and any contact information shared. This information is stored automatically so you should not offer to store it.
        2. If the user did not share any contact information, ask for at least one contact method (phone, email, instagram, etc.)
        3. If they mention meeting someone new, respond in a way that shows interest in the new connection
        4. Ask follow-up questions about the person if not much information was shared
        5. If the user mentions any foods, recreation activities, or arts/media that the contact likes, add it to the interests list
  
        When the user talks about multiple contacts together, they are probably part of a group
        1. Give the group a descriptive name
        2. Include the name of each person discussed in the context of the group
        3. Otherwise leave the contact_groups list empty
  
        When users provide feedback about a social interaction or "hang":
        1. Ask thoughtful follow-up questions about:
           - The quality of the conversation and connection
           - Any interesting topics or shared interests discovered
           - Their comfort level and engagement during the interaction
           - Whether they'd like to plan another hang with these people
        2. Look for patterns in their social preferences
        3. Use their feedback to make better suggestions for future social activities
        4. If they express any concerns or negative experiences, provide empathetic support and constructive suggestions
  
        Ask these questions one at a time to not overwhelm the user. Keep a natural conversational flow.
        
        Your response should be in this JSON format:
        {
          "text": "your conversational response here",
          contacts: [
            {
              name: string, the contact's name
              email?: string, the contact's email
              phone?: string, the contact's phone number
              instagram?: string, the contact's instagram handle
              linkedin?: string, the contact's linkedin handle
              twitter?: string, the contact's twitter handle
              meeting_story?: string, a brief description of the meeting
              relationship?: string, a brief summary of the relationship
              interests?: array of strings, a list of the contact's interests
            }
          ],
          contact_groups: [
            {
              name: string,
              contacts: [
                {
                  name: string
                }
              ]
            }
          ]
        }
        
        Use this context to provide personalized responses. Keep responses concise, friendly, and focused on helping users with their social life, relationships, and personal growth. ALWAYS try to leave the user with a call to action.`;
  }

  async chat(
    userId: string,
    message: string,
    contactInfo?: Contact[],
    secretMessage = false
  ): Promise<{ parsedResponse: any }> {
    // store user message
    this.saveChatMessage(userId, message, secretMessage, false)

    const profile = await this.getUserProfile(userId);
    const chatHistory = await this.getChatHistory(userId);

    const context = this.buildContext(profile);

    let events = await this.getEvents(profile.id, profile.utc_offset_minutes);

    const messages = chatHistory?.map(msg => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.message
    })) || [];

    // Extract names from the message and get their contact info
    let mentionedContacts = contactInfo ? contactInfo : [];
    if (!contactInfo) {
      const names = await extractNamesFromText(message);
      if (names.length > 0) { 
        mentionedContacts = await searchContactsByNames(userId, names);
        if (mentionedContacts.length === 0) {
          await upsertContacts(userId, names.map(name => ({name})));
          console.log('Upserting new contacts ', names);
          mentionedContacts = await searchContactsByNames(userId, names);
        }
        else if (names.some(name => !mentionedContacts.some(mc => mc.name.toLowerCase() === name.toLowerCase()))) {
          const newNames = names.filter(name => !mentionedContacts.some(mc => mc.name.toLowerCase().includes(name.toLowerCase())));
          console.log('Creating new contacts for:', newNames);
          await upsertContacts(userId, newNames.map(name => ({ name })));
          mentionedContacts = await searchContactsByNames(userId, names);
        }
      }
      console.log("mentioned contacts",mentionedContacts)
    }

    // Insert relevant contacts
    let contactContext = '';
    if (mentionedContacts.length > 0) {
      contactContext = `The people we are talking about:\n${JSON.stringify(mentionedContacts.map(contact => {
        const { id, ...contactWithoutId } = contact;
        return contactWithoutId;
      }), null, 2)}\n`;
      console.log('Inserting contextual contact data ', contactContext)
    }
    messages.push({
      role: 'user',
      content: contactContext + message
    });

    const systemPrompt = this.constructSystemPrompt(context.user, events);
    messages.unshift({
      role: 'system',
      content: systemPrompt
    });

    // Get response from OpenAI
    const response = await this.callOpenAI(messages, functions);
    let responseData = await response.json();
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
        if (toolCall.function.name === 'findFriendsForActivity') {
          const args = JSON.parse(toolCall.function.arguments);
          const friends = await findFriendsForActivity(userId, args.activity);
          messages.push(
            { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(friends, null, 2) }
          );
        }
      }
      
      // After processing all tool calls, get the final response
      const finalResponse = await this.callOpenAI(messages);
      const finalData = await finalResponse.json();
      parsedResponse = JSON.parse(finalData.choices[0].message.content);
    } else {
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (error) {
        console.error('Error parsing AI response:', error);
        parsedResponse = {
          text: "I'm sorry, I had an internal error. Can you file a bug report?",
          contacts: [],
        };
      }
    }
    console.log('parsed response', parsedResponse)

    let contacts = mentionedContacts;
    if (parsedResponse.contacts && 
        Array.isArray(parsedResponse.contacts) && 
        parsedResponse.contacts.length > 0 &&
        parsedResponse.contacts.every(contact => 
          typeof contact === 'object' && 
          contact !== null && 
          'name' in contact && 
          typeof contact.name === 'string'
        )) {
      contacts = await mergeContacts(mentionedContacts, parsedResponse.contacts);
      await upsertContacts(userId, contacts);
    }

    if (parsedResponse.contact_groups) {
      await upsertContactGroups(userId, parsedResponse.contact_groups, contacts);
    }

    // Save chat message
    if (parsedResponse.text) {
      await this.saveChatMessage(userId, parsedResponse.text, secretMessage, true);
    }
    

    return {parsedResponse};
  }

  private buildContext(profile: any) {
    let profileData = this.filterUserProfile(profile)
    const context = {
      user: profileData,
    };

    return context;
  }
}
