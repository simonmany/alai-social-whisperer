import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export enum ChatFunction {
  GetContactsByNames = 'getContactsByNames',
  UpsertContacts = 'upsertContacts',
}

const tools = [{
  "type": "function",
  "function": {
      "name": "getContactsByNames",
      "description": "Fetches a list of contacts by their names for a specific user from a Supabase database. Only call this once per turn",
      "strict": true,
      "parameters": {
          "type": "object",
          "required": [
              "userId",
              "names"
          ],
          "properties": {
              "userId": {
                  "type": "string",
                  "description": "Unique identifier for the user whose contacts are being fetched."
              },
              "names": {
                  "type": "array",
                  "description": "Array of contact names to be fetched.",
                  "items": {
                      "type": "string",
                      "description": "Full name of a contact."
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

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apikey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
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
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

async function getContactsByNames(userId: string, names: string[]) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (!names.length) return { data: null, error: null };

  const { data, error } = await supabaseClient
    .from('contacts')
    .select('name, email, phone, instagram, linkedin, twitter, meeting_story, relationship')
    .eq('user_id', userId)
    .in('name', names);

  if (error) {
    console.error('Error fetching contacts:', error);
    throw new Error(`Error fetching contacts: ${error.message}`);
  }

  if (!data) {
    return "No information found for the friends "+names.join(" ")
  }

  return data;
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
    console.error('Error inserting contacts:', error);
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

    console.log('Processing chat request:', { 
      userId, 
      messageLength: message?.length,
      hasContactInfo: !!contactInfo 
    });

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

    const { data: closestContacts } = await supabase
      .from('contacts')
      .select('name, email, phone, instagram, linkedin, twitter, meeting_story, relationship, closeness')
      .eq('user_id', userId)
      .order('closeness', { ascending: true })
      .limit(15);

    let contacts = closestContacts
    if (message.contacts) {
      const newContacts = message.contacts.filter(contact => !closestContacts?.some(c => c.id === contact.id));
      contacts = [...closestContacts, ...newContacts];
    }
    
    const chatMessages = chatHistory?.map(msg => ({
      content: msg.message,
      role: msg.is_ai ? 'assistant' : 'user'
    }));

    const formattedEvents = events?.map(event => ({
      ...event,
      start_time: new Date(event.start_time).toLocaleString(),
      end_time: new Date(event.end_time).toLocaleString()
    }));

    const systemPrompt = constructSystemPrompt(profileData, events, contacts)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatMessages || []),
      { role: 'user', content: message }
    ];
    
    let response = await callLLM(openAIApiKey, messages, tools);
    let responseData = await response.json();
    let aiResponse = responseData.choices[0].message.content;

    console.log('Initial AI response:', {
      hasToolCalls: !!responseData.choices[0].message.tool_calls,
      responseLength: aiResponse?.length
    });

    // Handle tool calls
    while (responseData.choices[0].message.tool_calls) {
      for (const toolCall of responseData.choices[0].message.tool_calls) {
        console.log('Processing tool call:', toolCall.function.name);
        
        const { name: toolName, arguments: toolArgs } = toolCall.function;
        const toolInput = JSON.parse(toolArgs);
        
        let toolResponse;
        if (toolName === ChatFunction.GetContactsByNames) {
          toolResponse = await getContactsByNames(userId, toolInput.names);
        } else if (toolName === ChatFunction.UpsertContacts) {
          toolResponse = await upsertContacts(userId, toolInput.contacts);
        } else {
          console.error('Invalid tool call:', toolName);
          throw new Error('Invalid tool call selected');
        }

        messages.push(responseData.choices[0].message);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResponse)
        });
      }

      response = await callLLM(openAIApiKey, messages, tools);
      responseData = await response.json();
      aiResponse = responseData.choices[0].message.content;
    }

    // Store AI response
    const { error: aiMessageError } = await supabase
      .from('chat_history')
      .insert([
        { user_id: userId, message: aiResponse, is_ai: true }
      ]);

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      throw aiMessageError;
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        contacts: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

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
