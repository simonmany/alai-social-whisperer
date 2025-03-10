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
    // Fetch ALL contacts using pagination to overcome the 1000 row limit
    // Supabase has a default limit of 1000 rows per query
    const fetchAllContacts = async () => {
      const PAGE_SIZE = 1000;
      let allContacts: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        
        console.log(`Fetching contacts page ${page} (${from}-${to})`);
        
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', userId)
          .range(from, to);
        
        if (error) {
          console.error('Error fetching contacts:', error);
          break;
        }
        
        if (data && data.length > 0) {
          allContacts = [...allContacts, ...data];
          page++;
          
          // If we got fewer records than the page size, we've reached the end
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`Fetched ${allContacts.length} total contacts for user ${userId}`);
      return allContacts;
    };
    
    const contacts = await fetchAllContacts();
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
    // Get current UTC date
    const utcNow = new Date();
    
    // Convert UTC now to user's local time
    const userLocalTimeISO = convertToLocalTime(utcNow.toISOString(), utcOffset);
    const userLocalTime = new Date(userLocalTimeISO);
    
    // Set to start of the user's local day
    const startOfUserDay = new Date(
      userLocalTime.getFullYear(),
      userLocalTime.getMonth(),
      userLocalTime.getDate(),
      0, 0, 0, 0
    );
    
    // Convert start of user's day back to UTC for database query
    // We need to manually adjust since the startOfUserDay is interpreted as UTC by toISOString()
    const startOfUserDayUTC = new Date(startOfUserDay.getTime() - (utcOffset * 60 * 1000));
    
    // Calculate ten days from the user's now
    const tenDaysFromUserNow = new Date(startOfUserDayUTC);
    tenDaysFromUserNow.setDate(startOfUserDayUTC.getDate() + 10);
    
    const { data: events } = await supabase
      .from('calendar_events')
      .select(`
        title,
        start_time,
        end_time,
        location,
        event_attendees!left (contacts!contact_id (id, name))`) // TODO ari should also load relationship?
      .eq('user_id', userId)
      .gte('start_time', startOfUserDayUTC.toISOString())
      .lte('start_time', tenDaysFromUserNow.toISOString())
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
    event_id?: string,
    event_title?: string,
    isMorningCheckin?: boolean,
    isEveningCheckin?: boolean
  ) {
    console.log('Saving chat message:', { 
      userId,
      isAI,
      isSecret,
      event_id,
      event_title,
      isMorningCheckin,
      isEveningCheckin,
      messagePreview: message.substring(0, 100) + '...'
    });

    const messageData = {
      user_id: userId,
      message,
      is_secret: isSecret,
      is_ai: isAI,
      event_id,
      event_title,
      morning_checkin: isMorningCheckin,
      evening_checkin: isEveningCheckin
    };

    console.log('Message data to insert:', messageData);

    const { error: userMessageError } = await supabase.from('chat_history').insert([messageData]);

    if (userMessageError) {
      console.error('Error storing message:', userMessageError);
      throw userMessageError;
    }

    console.log('Successfully saved chat message');
  }
}
