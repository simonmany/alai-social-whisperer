import { Contact } from '../types.ts';
import { convertToLocalTime } from '../../_shared/utils.ts';
import { supabase } from '../../_shared/supabase.ts'

export abstract class Agent {
  protected openaiKey: string;
  protected abstract systemPrompt: string;

  constructor(openAIApiKey: string) {
    this.openaiKey = openAIApiKey
  }

  protected async callOpenAI(messages: any[], tools?: any[]) {
    const requestBody: any = {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" },
    };
  
    if (tools) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }
    console.log('Sending request to OpenAI:', { 
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]
    });
  
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }
    return response;
  }

  abstract chat(
    userId: string,
    message: string,
    contactInfo?: Contact[],
    secretMessage?: boolean
  ): Promise<{ parsedResponse: any }>;

  protected async getUserProfile(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!profile) {
      throw new Error(`Could not find profile for ${userId}`)
    }
    return profile;
  }

  protected filterUserProfile(profile: any) {
    let profileData = Object.fromEntries(
      Object.entries({
        username: profile.username,
        goals: profile.goals,
        personality_comments: profile.personality_comments,
        current_interests: profile.current_interests,
        desired_interests: profile.desired_interests,
        age: profile.age,
        city: profile.city,
        languages: profile.languages,
        relationship_status: profile.relationship_status,
        gender: profile.gender,
        occupation: profile.occupation,
      }).filter(([_, value]) => value != null && value !== '' && value !== undefined && (!Array.isArray(value) || value.length > 0))
    );
    return profileData
  }

  protected async getUserContacts(userId: string) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId);
    return contacts || [];
  }

  protected async getChatHistory(userId: string, limit: number = 7) {
    const { data: history } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return history ? history.reverse() : [];    
  }

  protected async getEvents(userId: string, utcOffset: number = -240) {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(now.getDate() + 10);
    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', now.toISOString())
      .lte('start_time', tenDaysFromNow.toISOString())
      .order('start_time', { ascending: true });

    // Convert event times to local timezone
    const localEvents = events?.map(event => ({
      ...event,
      start_time: convertToLocalTime(event.start_time, utcOffset),
      end_time: convertToLocalTime(event.end_time, utcOffset)
    })) || [];

    return localEvents;
  }

  protected async saveChatMessage(
    userId: string,
    message: string,
    isSecret: boolean,
    isAI: boolean,
  ) {
    console.log('storing message')
    const { error: userMessageError } = await supabase.from('chat_history').insert([
      {
        user_id: userId,
        message,
        is_secret: isSecret,
        is_ai: isAI,
      },
    ]);
    if (userMessageError) {
      console.error('Error storing message:', userMessageError);
      throw userMessageError;
    }
  }
}
