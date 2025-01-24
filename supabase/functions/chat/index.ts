import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
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

    // Fetch upcoming calendar events for the next 30 days
    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true });

    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Sending request to OpenAI with context:', { profile, events, chatHistory });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Al, a friendly and helpful social life assistant. You have access to the following user data:
              - Profile: ${JSON.stringify(profile)}
              - Calendar Events for the next 30 days: ${JSON.stringify(events)}
              - Recent Chat History: ${JSON.stringify(chatHistory)}
              
              When discussing calendar events, always format dates and times in a user-friendly way.
              If asked about the calendar, you can:
              - List upcoming events
              - Suggest free time slots for new activities
              - Help identify scheduling conflicts
              - Provide summaries of the user's schedule
              
              Use this context to provide personalized responses. Keep responses concise, friendly, and focused on helping users with their social life, relationships, and personal growth.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Store AI response in chat history
    const { error: aiMessageError } = await supabase
      .from('chat_history')
      .insert([
        { user_id: userId, message: aiResponse, is_ai: true }
      ]);

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      throw aiMessageError;
    }

    return new Response(JSON.stringify({ 
      response: aiResponse 
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