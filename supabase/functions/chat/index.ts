import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store user message first
    const { error: userMessageError } = await supabase
      .from('chat_history')
      .insert([
        { user_id: userId, message, is_ai: false }
      ]);

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
      throw userMessageError;
    }

    // Fetch user profile and context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

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

    const formattedEvents = events?.map(event => ({
      ...event,
      start_time: new Date(event.start_time).toLocaleString(),
      end_time: new Date(event.end_time).toLocaleString()
    }));

    const systemPrompt = `You are Al, a friendly and helpful social life assistant. You have access to the following user data:
      - Profile: ${JSON.stringify(profile)}
      - Calendar Events for the next 30 days: ${JSON.stringify(formattedEvents)}
      - Recent Chat History: ${JSON.stringify(chatHistory)}
      
      When discussing calendar events, always format dates and times in a user-friendly way.
      
      When users mention meeting someone new or multiple people:
      1. Extract each person's information separately
      2. For each person mentioned, identify:
         - Their full name
         - Their relationship or role (e.g., "basketball friend", "fellow investor")
         - Any contact information shared
      3. Return an array of contacts, where each contact has:
         - name: the person's full name
         - relationship: their relationship to the user
         - email: their email if provided, otherwise null
      
      Your response should be in this format:
      {
        "text": "your conversational response here",
        "contacts": [
          {
            "name": "person 1 name",
            "relationship": "their relationship",
            "email": "email if provided or null"
          }
        ]
      }`;

    console.log('Sending request to OpenAI with message:', message);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('Error parsing AI response:', e);
      parsedResponse = {
        text: data.choices[0].message.content,
        contacts: []
      };
    }

    // Store AI response
    const { error: aiMessageError } = await supabase
      .from('chat_history')
      .insert([
        { user_id: userId, message: parsedResponse.text, is_ai: true }
      ]);

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      throw aiMessageError;
    }

    // Handle contacts if any were extracted
    if (parsedResponse.contacts && Array.isArray(parsedResponse.contacts)) {
      for (const contact of parsedResponse.contacts) {
        if (contact.name) {
          const { error: contactError } = await supabase
            .from('contacts')
            .insert([{
              user_id: userId,
              name: contact.name,
              email: contact.email || null
            }]);

          if (contactError) {
            console.error('Error storing contact:', contactError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      response: parsedResponse.text 
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