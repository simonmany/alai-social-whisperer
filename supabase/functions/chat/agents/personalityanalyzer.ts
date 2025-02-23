import { Agent } from "./base.ts";
import { Contact } from "../types.ts";

export class PersonalityAnalyzerAgent extends Agent {
  protected systemPrompt = `You are an expert at analyzing personality traits and social preferences based on user responses.
    Provide concise, insightful analysis of the user's social style and personality traits.
    Speak directly to them using 'you' and keep the tone casual and friendly.
    Format your response as JSON with the following structure:
    {
        "text": "Your friendly, conversational analysis of their personality and social style",
        "traits": {
            "social_style": "string describing their general social approach",
            "key_strengths": ["list", "of", "strengths"],
            "growth_areas": ["list", "of", "potential", "growth", "areas"],
            "relationship_style": "string describing how they tend to interact in relationships"
        },
        "recommendations": {
            "social_activities": ["list", "of", "recommended", "activities"],
            "communication_tips": ["list", "of", "effective", "communication", "strategies"],
            "growth_suggestions": ["list", "of", "personal", "growth", "suggestions"]
        }
    }
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

    // Save the incoming message
    this.saveChatMessage(userId, message, secretMessage, false);
    
    // Get recent chat history for better context
    const chatHistory = await this.getChatHistory(userId, 10);
    
    // Build context for the AI
    const context = {
      user: profileData,
      chat_history: chatHistory,
      current_message: message
    };

    // Prepare messages for the AI
    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `Context: ${JSON.stringify(context, null, 2)}\n\nAnalyze the personality and social preferences based on this context.` }
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
