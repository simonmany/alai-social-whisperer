import { Agent } from './base.ts';
import { Contact } from '../types.ts';
import { searchGooglePlaces } from '../utils.ts';
import { functions } from '../types.ts';

export class HangPlannerAgent extends Agent {
  protected systemPrompt = `You are helping the user plan a hangout step by step. The steps you will go through are as follows:
  - Ask the user what they would like to do with the mentioned friend
  - Based on the user's response, ask where they would like to meet the friend. Provide a place suggestion from searchGooglePlaces
  - Ask the user when they would like to meet the friend. Always include the phrase "Pick a date and time"

  Do not move on to the next step until the user has answered the previous step.
  
  As you collect all of this information, return a JSON with the following structure:
  {
    "text": your conversational response,
    "contacts": [the people the user is inviting to the hangout],
    "activity": the activity the user and their friend will be doing,
    "datetime": {
      "date": the date the hangout is scheduled to take place,
      "time": the time the hangout is scheduled to take place using the 12 hour clock
    },
    "location": the location the hangout will take place at,
    "done": bool, whether all of the other fields are filled including datetime.date and datetime.time
  }`

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
    const context = {
      user: profileData,
      contacts: contactInfo || []
    };

    messages.push({role: 'user', content: `Context: ${JSON.stringify(context, null, 2)}\nMessage: ${message}`})

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

    this.saveChatMessage(userId, message, secretMessage, false);

    if (parsedResponse.text) {
      this.saveChatMessage(userId, parsedResponse.text, secretMessage, true);
    }
    return { parsedResponse };
  }
}
