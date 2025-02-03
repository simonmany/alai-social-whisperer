import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import nlp from 'https://esm.sh/compromise@14.10.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

async function callLLM(apikey: string, messages: any[], tools: any[]) {
  console.log('Sending request to OpenAI:', { 
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]
  });
  console.log(messages[0])

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apikey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      tools: tools
    }),
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
  - Profile: ${JSON.stringify(profile, null, 2)}
  - Calendar Events for the next 30 days: ${JSON.stringify(events, null, 2)}
  - Closest friends: ${JSON.stringify(contacts, null, 2)}
  
  When discussing calendar events, always format dates and times in a user-friendly way.

  When discussing a friend or contact, ALWAYS follow these steps in order:
  1. FIRST, check if the person is in the closest friends list above. If they are, use that data and include it at the end of your response. DO NOT call any functions in this case.
  2. ONLY if the person is NOT found in the closest friends list, then use extractContacts to check if they exist in the database.
  3. If extractContacts returns no results, then try to collect their full name and at least one contact method (phone, email, instagram, etc).
    Once you have collected their contact information, format it as follows:
    {
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
  
  When the user says they want to contact a friend, include the contact information at the very end of your message.
  Use this context to provide personalized responses. Keep responses concise, friendly, and focused on helping users with their social life, relationships, and personal growth.`;
}

function extractNamesWithCompromise(text: string): string[] {
  try {
    const doc = nlp(text);
    const people = doc.people().out('array');
    
    // Clean up names - remove titles and normalize
    const possibleNames = people.map(name => {
      return name
        .replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, '') // Remove titles
        .replace(/\s+/g, ' ')                        // Normalize whitespace
        .trim();
    }).filter(Boolean); // Remove empty strings
    
    console.log('Compromise found possible names:', possibleNames);
    return possibleNames;
  } catch (error) {
    console.error('Error in compromise processing:', error);
    return [];
  }
}

async function verifyNamesWithOpenAI(text: string, possibleNames: string[]): Promise<string[]> {
  if (possibleNames.length === 0) {
    return [];
  }

  console.log('Verifying names with OpenAI:', possibleNames);
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
          content: `You are a name verification tool. The following names were detected in the text: ${possibleNames.join(', ')}. 
                   Verify which of these are actually person names in the context. Return a JSON object with a "names" array containing only the verified names.
                   Only include actual names, not pronouns or generic terms. Example response format: {"names": ["John Smith", "Mary Johnson"]}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    console.error('Error calling OpenAI:', await response.text());
    return possibleNames; // Fall back to compromise results if OpenAI fails
  }
  
  try {
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    console.log('OpenAI verified names:', result.names);
    return result.names || [];
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return possibleNames; // Fall back to compromise results if parsing fails
  }
}

async function extractNamesFromText(text: string): Promise<string[]> {
  // First, try to find names using compromise
  const possibleNames = extractNamesWithCompromise(text);
  
  // If compromise found any potential names, verify them with OpenAI
  if (possibleNames.length > 0) {
    return await verifyNamesWithOpenAI(text, possibleNames);
  }
  
  return [];
}

async function upsertContacts(userId: string, contacts: { name: string; email?: string; phone?: string; instagram?: string; linkedin?: string; twitter?: string; meeting_story?: string; relationship?: string }[]) {
  const supabaseClient = createClient(
    Deno.env.get('BACKEND_URL') ?? '',
    Deno.env.get('SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabaseClient
    .from('contacts')
    .upsert(contacts.map(contact => ({
      ...contact,
      user_id: userId,
    })));

  if (error) {
    console.error('Error inserting contacts:', error);
    throw new Error(`Error upserting contacts: ${error.message}`);
  }

  return data;
}

async function createContact(userId: string, contact: { name: string; email?: string; phone?: string; instagram?: string; linkedin?: string; twitter?: string; meetingStory?: string; relationship?: string }) {
  const supabaseClient = createClient(
    Deno.env.get('BACKEND_URL') ?? '',
    Deno.env.get('SERVICE_ROLE_KEY') ?? ''
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, contactInfo } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('BACKEND_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    console.log('Processing chat request:', { userId, messageLength: message.length });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save contact info if provided
    if (contactInfo && contactInfo.name) {
      const { data, error: contactError } = await createContact(userId, contactInfo);

      if (contactError) {
        console.error('Error storing contact:', contactError);
      }
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

    // Extract names from the message and get their contact info
    const names = await extractNamesFromText(message);
    let mentionedContacts = [];
    if (names.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('name, email, phone, instagram, linkedin, twitter, meeting_story, relationship')
        .eq('user_id', userId)
        .in('name', names);
      
      if (contacts) {
        mentionedContacts = contacts;
      }
    }

    const messages = chatHistory?.map(msg => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.message
    })) || [];

    messages.push({
      role: 'user',
      content: message
    });

    const systemPrompt = constructSystemPrompt(profileData, events, mentionedContacts);
    messages.unshift({
      role: 'system',
      content: systemPrompt
    });

    let response = await callLLM(openAIApiKey, messages, tools);

    let responseData = await response.json();
    let aiResponse = responseData.choices[0].message.content;
    console.log(responseData)

    console.log(responseData.choices[0].message.tool_calls)
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

        if (!data) {
          throw new Error('Invalid tool call selected', toolCall);
        }
        console.log(data)
        
        messages.push(responseData.choices[0].message); // append model's function call message
        messages.push({                               // append result message
            role: "tool",
            tool_call_id: responseData.choices[0].message.tool_calls[0].id,
            content: data.toString()
        });
      }
      response = await callLLM(openAIApiKey, messages, tools);
      responseData = await response.json();
      console.log(responseData)
      aiResponse = responseData.choices[0].message.content;
    }

    console.log(aiResponse)

    return new Response(JSON.stringify({ 
      response: aiResponse,
      contacts: mentionedContacts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});