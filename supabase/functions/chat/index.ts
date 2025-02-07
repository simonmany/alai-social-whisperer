import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export enum ChatFunction {
  UpsertContacts = 'upsertContacts',
}

const tools = [{
  "type": "function",
  "function": {
      "name": "upsertContacts",
      "description": "Store contact information for one or more people in the database",
      "strict": true,
      "parameters": {
          "type": "object",
          "required": [
              "userId",
              "contacts"
          ],
          "properties": {
              "userId": {
                  "type": "string",
                  "description": "Unique identifier for the user whose contacts are being stored."
              },
              "contacts": {
                  "type": "array",
                  "description": "Array of contact information to be stored.",
                  "items": {
                      "type": "object",
                      "required": ["name"],
                      "properties": {
                          "name": {
                              "type": "string",
                              "description": "Full name of the contact."
                          },
                          "email": {
                              "type": "string",
                              "description": "Email address of the contact."
                          },
                          "phone": {
                              "type": "string",
                              "description": "Phone number of the contact."
                          },
                          "instagram": {
                              "type": "string",
                              "description": "Instagram handle of the contact."
                          },
                          "linkedin": {
                              "type": "string",
                              "description": "LinkedIn profile URL or username of the contact."
                          },
                          "twitter": {
                              "type": "string",
                              "description": "Twitter handle of the contact."
                          },
                          "meeting_story": {
                              "type": "string",
                              "description": "Story of how you met this contact."
                          },
                          "relationship": {
                              "type": "string",
                              "description": "Nature of your relationship with this contact."
                          }
                      }
                  }
              }
          },
          "additionalProperties": false
      }
  }
}];

async function callLLM(apiKey: string, messages: any[], tools?: any[]) {
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
  console.log(messages[0])

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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

function constructSystemPrompt(profile: any, events: any, contacts: any) {
  return `You are Al, a friendly and helpful social life assistant. You have access to the following user data:
      - Profile: ${JSON.stringify(profile)}
      - Calendar Events for the next 30 days: ${JSON.stringify(events)}
      
      When discussing calendar events, always format dates and times in a user-friendly way.
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
      1. Extract the person's name and any contact information shared
      2. If they mention meeting someone new, respond in a way that shows interest in the new connection
      3. Ask follow-up questions about the person if not much information was shared

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
            name: string
            email?: string
            phone?: string
            instagram?: string
            linkedin?: string
            twitter?: string
            meeting_story?: string
            relationship?: string
          }
        ]
      }
      
      Use this context to provide personalized responses. Keep responses concise, friendly, and focused on helping users with their social life, relationships, and personal growth.`;
}

async function extractNamesFromText(text: string): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a name extraction tool. Extract ONLY the names of people mentioned in the text. Return them as a JSON object with a single "names" array containing the extracted names as strings. Only include actual names, not pronouns or generic terms like "friend" or "sister". Return an empty array if no names are found. Example response format: {"names": ["John Smith", "Mary Johnson"]}'
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1 // Low temperature for more consistent results
    }),
  });

  if (!response.ok) {
    console.error('Error calling OpenAI:', await response.text());
    return [];
  }
  
  try {
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    console.log('Extracted names:', result.names);
    return result.names || [];
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return [];
  }
}


async function searchContactsByNames(userId: string, names: string[]) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let mentionedContacts = [];
  if (names.length > 0) {
    const { data, error } = await supabaseClient
      .from('contacts')
      .select('name, email, phone, instagram, linkedin, twitter, meeting_story, relationship')
      .eq('user_id', userId);
    if (error) {
      console.error('Error searching contacts:', error);
      throw new Error(`Error searching contacts: ${error.message}`);
    }
    console.log('Found contacts', data)

    const filteredContacts = data.filter(contact => names.some(name => contact.name.toLowerCase().includes(name.toLowerCase())));
    
    mentionedContacts = filteredContacts.map(contact => Object.fromEntries(
      Object.entries(contact).filter(([_, value]) => value !== null)
    ));
  }

  return mentionedContacts;
}

async function upsertContacts(userId: string, contacts: { name: string; email?: string; phone?: string; instagram?: string; linkedin?: string; twitter?: string; meeting_story?: string; relationship?: string }[]) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabaseClient
    .from('contacts')
    .upsert(contacts.map(contact => ({
      ...contact,
      user_id: userId,
    })));

  if (error) {
    console.error('Error upserting contacts:', error);
    throw new Error(`Error upserting contacts: ${error.message}`);
  }

  return data;
}

async function createContact(userId: string, contact: { name: string; email?: string; phone?: string; instagram?: string; linkedin?: string; twitter?: string; meetingStory?: string; relationship?: string }) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabaseClient
  .from('contacts')
  .insert([{
    user_id: userId,
    name: contact.name,
    phone: contact.phone,
    instagram: contact.instagram,
    linkedin: contact.linkedin,
    twitter: contact.twitter,
    meeting_story: contact.meetingStory,
    relationship: contact.relationship,
    created_at: new Date().toISOString()
  }]);

  if (error) {
    console.error('Error inserting contact:', error);
    throw new Error(`Error inserting contact: ${error.message}`);
  }

  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { message, userId, contactInfo } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      throw new Error('Server configuration error');
    }

    console.log('Processing chat request:', { userId, contactInfo });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save contact info if provided
    if (contactInfo && contactInfo.name) {
      console.log('Creating contact:', contactInfo);
      await createContact(userId, contactInfo);
    }

    // Store user message
    const { error: userMessageError } = await supabase
    .from('chat_history')
    .insert([
      { user_id: userId, message, is_ai: false }
    ]);

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
      throw userMessageError;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const profileData = {
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
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', now.toISOString())
      .lte('start_time', thirtyDaysFromNow.toISOString())
      .order('start_time', { ascending: true });

    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // // Extract names from the message and get their contact info
    let mentionedContacts = contactInfo ? [contactInfo] : [];
    if (contactInfo === undefined) {
      // only need to lookup if info wasn't passed in
      const names = await extractNamesFromText(message);
      if (names.length > 0) { 
        mentionedContacts = await searchContactsByNames(userId, names);
        if (mentionedContacts.length === 0) {
          await upsertContacts(userId, names.map(name => ({name})));
          console.log('Upserting new contacts ', names);
        }
        mentionedContacts = await searchContactsByNames(userId, names);
      }
    }

    // // Get closest contacts
    // const { data: closestContacts } = await supabase
    //   .from('contacts')
    //   .select('name, email, phone, instagram, linkedin, twitter, meeting_story, relationship, closeness')
    //   .eq('user_id', userId)
    //   .order('closeness', { ascending: false })
    //   .limit(15);

    // // Combine mentioned contacts with closest contacts, removing duplicates
    // const allContacts = [...mentionedContacts];
    // if (closestContacts) {
    //   for (const contact of closestContacts) {
    //     if (!allContacts.some(c => c.name === contact.name)) {
    //       allContacts.push(contact);
    //     }
    //   }
    // }

    const messages = chatHistory?.map(msg => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.message
    })) || [];

    let contactContext = '';
    if (mentionedContacts.length > 0) {
      contactContext = `We are talking about my ${mentionedContacts.length === 1 ? 'friend' : 'friends'}. Their data is:\n${JSON.stringify(mentionedContacts, null, 2)}\n`;
      console.log('Inserting contextual contact data ', contactContext)
    }

    messages.push({
      role: 'user',
      content: contactContext + message
    });

    const systemPrompt = constructSystemPrompt(profileData, events, mentionedContacts);
    messages.unshift({
      role: 'system',
      content: systemPrompt
    });

    let response = await callLLM(openAIApiKey, messages);
    let responseData = await response.json();
    let aiResponse = responseData.choices[0].message.content;

    console.log('tool calls', responseData.choices[0].message.tool_calls)
    while (responseData.choices[0].message.tool_calls) {
      for (let i = 0; i < responseData.choices[0].message.tool_calls.length; i++) {
        let toolCall = responseData.choices[0].message.tool_calls[i].function;
        console.log(toolCall)
        let toolName = toolCall.name;
        let toolInput = JSON.parse(toolCall.arguments);
        console.log(toolInput)
        let data;
        if (toolName == ChatFunction.UpsertContacts) {
          data = await upsertContacts(userId, toolInput.contacts);
        }

        messages.push(responseData.choices[0].message);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(data)
        });
      }

      response = await callLLM(openAIApiKey, messages, tools);
      responseData = await response.json();
      aiResponse = responseData.choices[0].message.content;
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Error parsing AI response:', e);
      parsedResponse = {
        text: aiResponse,
        contacts: []
      };
    }
    console.log('parsed response', parsedResponse)

    // Handle multiple contacts
    if (parsedResponse.contacts && Array.isArray(parsedResponse.contacts && parsedResponse.contacts.length > 0)) {
      const { error: contactError } = await upsertContacts(userId, parsedResponse.contacts);

      if (contactError) {
        console.error('Error storing contacts:', contactError);
      }
    }

    const { error: aiMessageError } = await supabase
      .from('chat_history')
      .insert([
        { user_id: userId, message: parsedResponse.text, is_ai: true }
      ]);

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      throw aiMessageError;
    }

    return new Response(JSON.stringify({ 
      response: parsedResponse.text,
      contacts: parsedResponse.contacts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
