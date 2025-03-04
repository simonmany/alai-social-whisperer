import { Agent } from './base.ts';
import { Contact } from '../types.ts';

export class DailyCheckinAgent extends Agent {
  protected systemPrompt = `You are helping the user with their daily check-in. The check-in type will be provided in the context as either 'morning', 'evening', or 'post-event'.

  For morning check-ins:
  - Review their scheduled events for the day
  - Provide encouragement and support for their social connections
  - If they have incomplete goals, ask them about setting specific targets

  For evening check-ins:
  - Ask about their rose (highlight), bud (opportunity), and thorn (challenge) of the day
  - Pay special attention to mentions of people, activities, and places to better understand their preferences
  - If they have incomplete goals, encourage them to reflect on their social connections

  For post-event check-ins:
  - Ask about their experience at the specific event
  - Gather information about who they met with and what they did
  - Note their satisfaction level with the event and participants

  As you collect information, return a JSON with the following structure:
  {
    "text": your conversational response,
    "type": the type of check-in ('morning', 'evening', or 'post-event'),
    "insights": {
      "people": [names of people mentioned],
      "activities": [activities mentioned],
      "places": [places mentioned],
      "sentiment": overall sentiment of the interaction (positive, neutral, or negative)
    },
    "goals_discussed": boolean indicating if goals were discussed
  }

  Always maintain a supportive and encouraging tone while gathering insights about the user's social connections and preferences.
`

  async chat(
    userId: string,
    message: string,
    contactInfo?: Contact[],
    secretMessage?: boolean,
    event_id?: string,
    event_title?: string,
    checkinType?: string
  ): Promise<{ parsedResponse: any }> {
    // Get user profile for context
    const profile = await this.getUserProfile(userId);
    const profileData = this.filterUserProfile(profile);
    const messages = [{
      role: 'system',
      content: this.systemPrompt
    },
    {role: 'user', content: `User Profile: ${JSON.stringify(profileData, null, 2)}\nMessage: ${message}`}];
    const isMorningCheckin = checkinType === 'morning';
    const isEveningCheckin = checkinType === 'evening';
    console.log('DailyCheckinAgent processing:', {
      userId,
      checkinType,
      isMorningCheckin,
      isEveningCheckin,
      event_id,
      event_title
    });

    // Get response from OpenAI
    const response = await this.callOpenAI(messages);
    const responseData = await response.json();
    
    try {
      const parsedResponse = JSON.parse(responseData.choices[0].message.content);
      console.log('Parsed response from OpenAI:', parsedResponse);
      
      // Ensure type is set based on checkinType
      if (!parsedResponse.type && checkinType) {
        parsedResponse.type = checkinType;
      }
      
      // Save the AI's response with morning check-in flag if applicable
      console.log('Saving AI response:', { parsedResponse, isMorningCheckin });
      await this.saveChatMessage(
        userId,
        JSON.stringify(parsedResponse),
        secretMessage || false,
        true,
        event_id,
        event_title,
        isMorningCheckin,
        isEveningCheckin
      );
      
      return { parsedResponse };
    } catch (error) {
      console.error('Error parsing response:', error);
      // If parsing fails, return the raw response
      const text = responseData.choices[0].message.content;
      await this.saveChatMessage(
        userId,
        JSON.stringify({
          text,
          type: checkinType || 'unknown',
          insights: {
            people: [],
            activities: [],
            places: [],
            sentiment: 'neutral'
          },
          goals_discussed: false
        }),
        secretMessage || false,
        true,
        event_id,
        event_title,
        isMorningCheckin,
        isEveningCheckin
      );
      return { 
        parsedResponse: {
          text,
          type: 'unknown',
          insights: {
            people: [],
            activities: [],
            places: [],
            sentiment: 'neutral'
          },
          goals_discussed: false
        }
      };
    }
  }
}
