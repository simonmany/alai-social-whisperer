import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ChitChatAgent } from "./agents/chitchat.ts";
import { HangGeneratorAgent } from "./agents/hanggenerator.ts";
import { PersonalityAnalyzerAgent } from "./agents/personalityanalyzer.ts";
import { ConversationType } from "./types.ts";
import { HangPlannerAgent } from "./agents/hangplanneragent.ts";
import { DailyCheckinAgent } from "./agents/dailycheckinagent.ts";
import { supabase } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { message, userId, contactInfo, secretMessage, conversationType, event_id, event_title } = body;

    if (!message || !userId || !conversationType) {
      console.error('Missing required fields:', { message, userId, conversationType });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Chat request details:', { userId, conversationType, event_id, event_title });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('Missing openai api key');
      throw new Error('Server configuration error');
    }

    console.log('Processing chat request:', { userId, conversationType });

    // Create appropriate agent based on conversation type
    let agent;
    switch (conversationType) {
      case ConversationType.HANG_GENERATOR:
        agent = new HangGeneratorAgent(openAIApiKey);
        break;
      case ConversationType.PERSONALITY_ANALYZER:
        agent = new PersonalityAnalyzerAgent(openAIApiKey);
        break;
      case ConversationType.CHAT:
        agent = new ChitChatAgent(openAIApiKey);
        break;
      case ConversationType.HANG_PLANNER:
        agent = new HangPlannerAgent(openAIApiKey);
        break;
      case ConversationType.DAILY_CHECKIN:
        agent = new DailyCheckinAgent(openAIApiKey);
        break;
    }

    if (agent) {
      const { parsedResponse } = await agent.chat(userId, message, contactInfo, secretMessage, event_id, event_title);

      return new Response(JSON.stringify({ response: parsedResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid chat endpoint' }), {
      status: 400,
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
