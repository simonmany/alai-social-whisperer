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
      throw new Error('Missing environment variables');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store user message in chat history
    const { error: userMessageError } = await supabase
      .from('chat_history')
      .insert([
        { user_id: userId, message, is_ai: false }
      ]);

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
      throw userMessageError;
    }

    // Fetch user data and context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Fetch calendar events for the next 30 days
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

    // Format events for better readability
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
      
      Your response should be in this format:
      {
        "text": "your conversational response here",
        "contact": {
          "name": "extracted name if someone new was mentioned, otherwise null",
          "email": "extracted email if shared, otherwise null"
        }
      }
      
      Use this context to provide personalized responses. Keep responses concise, friendly, and focused on helping users with their social life, relationships, and personal growth.`;

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
        contact: { name: null, email: null }
      };
    }

    // If a new contact was detected, save it to the database
    if (parsedResponse.contact && parsedResponse.contact.name) {
      const { error: contactError } = await supabase
        .from('contacts')
        .insert([{
          user_id: userId,
          name: parsedResponse.contact.name,
          email: parsedResponse.contact.email
        }]);

      if (contactError) {
        console.error('Error storing contact:', contactError);
      }
    }

    // Store AI response in chat history
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