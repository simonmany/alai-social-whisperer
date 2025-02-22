
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  userId: string;
  startTime: string;
  endTime: string;
}

async function callOpenAI(apiKey: string, messages: any[]) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, startTime, endTime }: RequestBody = await req.json();

    // Validate required parameters
    if (!userId || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch chat messages for the specified time range
    const { data: messages, error } = await supabase
      .from('chat_history')
      .select('message, created_at, is_al')
      .eq('user_id', userId)
      .gte('created_at', startTime)
      .lte('created_at', endTime)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ summary: 'No messages found for the specified time range.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format messages for OpenAI
    const formattedMessages = messages.map(msg => ({
      role: msg.is_al ? 'assistant' : 'user',
      content: msg.message
    }));

    // Prepare system message for summarization
    const systemMessage = {
      role: 'system',
      content: `You are a helpful assistant tasked with summarizing a conversation between a human and an AI. 
      Please provide a concise summary that captures the main points, key decisions, 
      and important information discussed. Focus on the user's relationships with their friends and social events.
      Format the summary in a clear, organized way.`
    };

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API key');
    }

    // Get summary from OpenAI
    const summary = await callOpenAI(openaiApiKey, [
      systemMessage,
      ...formattedMessages,
      {
        role: 'user',
        content: 'Please provide a summary of this conversation.'
      }
    ]);

    // Store the summary in the chat_summaries table
    const { error: insertError } = await supabase
      .from('chat_summaries')
      .insert({
        user_id: userId,
        chat_start: startTime,
        chat_end: endTime,
        summary: summary
      });

    if (insertError) {
      throw new Error(`Failed to store chat summary: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
