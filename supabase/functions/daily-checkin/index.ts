
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface CheckInRequest {
  type: 'morning' | 'evening' | 'post-event';
  user_id?: string;
  event_id?: string;
  event_title?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { type, user_id, event_id, event_title }: CheckInRequest = await req.json();
    console.log('Daily check-in request:', { type, user_id, event_id, event_title });

    if (!type) {
      throw new Error('Check-in type is required');
    }

    let message = '';

    switch (type) {
      case 'morning':
        if (!user_id) throw new Error('User ID is required for morning check-in');
        message = "Let's start our morning check-in! How are you feeling today?";
        break;
      case 'evening':
        if (!user_id) throw new Error('User ID is required for evening check-in');
        message = "Time for our evening recap! How was your day?";
        break;
      case 'post-event':
        if (!user_id || !event_id || !event_title) {
          throw new Error('User ID, event ID, and event title are required for post-event check-in');
        }
        message = `How was your event "${event_title}"? Let me know how it went!`;
        break;
      default:
        throw new Error('Invalid check-in type');
    }

    console.log('Calling chat function with message:', message);

    // Call the chat function with explicit string type
    const chatResponse = await supabaseClient.functions.invoke('chat', {
      body: {
        message,
        userId: user_id,
        conversationType: 'CHAT',
        isSystemMessage: true
      }
    });

    if (chatResponse.error) {
      console.error('Chat function error:', chatResponse.error);
      throw chatResponse.error;
    }

    console.log('Chat response:', chatResponse.data);

    return new Response(
      JSON.stringify({ success: true, message: 'Check-in initiated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily-checkin function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
