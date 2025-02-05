import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activities, food, music, userId } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `I'm looking at someone's interests and I want to give them a friendly, encouraging response about their preferences. Here's what they like:

Activities: ${activities.join(', ')}
Food: ${food.join(', ')}
Music: ${music.join(', ')}

Give a brief, warm response (max 100 words) that:
1. Shows enthusiasm about their diverse interests
2. Makes a specific observation about how their preferences might complement each other
3. Encourages them to think about new things they might want to try

Speak directly to them using "you" and keep the tone casual and friendly.`;

    console.log('Sending request to OpenAI:', { 
      activitiesCount: activities.length,
      foodCount: food.length,
      musicCount: music.length
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a friendly AI assistant helping someone explore their interests.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to generate response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Received OpenAI response:', { 
      responseLength: aiResponse.length 
    });

    return new Response(JSON.stringify({ 
      response: aiResponse 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-preferences function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});