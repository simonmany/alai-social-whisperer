import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { convertToLocalTime, extractNamesFromText, searchContactsByNames, upsertContacts , upsertContactGroup, upsertContactGroupMemberships, mergeContacts, searchGooglePlaces} from './utils.ts';
import { ChitChatAgent } from "./agents/chitchat.ts";

enum ConversationType {
  CHAT = 'CHAT',
  HANG_PLANNER = 'HANG_PLANNER',
  PERSONALITY_ANALYZER = 'PERSONALITY_ANALYZER'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const functions = [
  {
    "type": "function",
    "function": {
      "name": "searchGooglePlaces",
      "description": "Searches for places using Google Places API based on a search string and optional location.",
      "strict": true,
      "parameters": {
          "type": "object",
          "required": [
              "searchString",
              "location"
          ],
          "properties": {
              "searchString": {
                  "type": "string",
                  "description": "The search query for the places, such as a name or keyword."
              },
              "location": {
                  "type": "string",
                  "description": "An optional parameter to specify a location context for the search."
              }
          },
          "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
        "name": "findFriendsForActivity",
        "description": "Identifies two friends who are most likely to match a given activity based on the user's contacts.",
        "strict": true,
        "parameters": {
            "type": "object",
            "required": [
                "userId",
                "activity"
            ],
            "properties": {
                "userId": {
                    "type": "string",
                    "description": "The ID of the user for whom to find friends for an activity"
                },
                "activity": {
                    "type": "string",
                    "description": "The activity around which to find matching friends"
                }
            },
            "additionalProperties": false
        }
    }
  }
];

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
    const { message, userId, contactInfo, secretMessage, conversationType } = body;

    if (!message || !userId || !conversationType) {
      console.error('Missing required fields:', { message, userId, conversationType });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('Missing openai api key');
      throw new Error('Server configuration error');
    }

    console.log('Processing chat request:', { userId, conversationType });

    if (conversationType === ConversationType.CHAT) {
      const chitChatAgent = new ChitChatAgent(openAIApiKey);
      const { parsedResponse, contacts } = await chitChatAgent.chat(userId, message, contactInfo, secretMessage);
      return new Response(JSON.stringify({ response: parsedResponse, contacts }), {
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
