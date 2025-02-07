
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get completed events in the last 15 minutes that haven't had feedback sent
    const { data: completedEvents, error: eventsError } = await supabaseClient
      .from('calendar_events')
      .select(`
        id,
        title,
        user_id,
        end_time,
        event_feedback_status!left(feedback_sent)
      `)
      .lt('end_time', 'now()')
      .gt('end_time', "now() - interval '15 minutes'")
      .is('event_feedback_status.feedback_sent', null);

    if (eventsError) {
      throw eventsError;
    }

    console.log(`Found ${completedEvents?.length || 0} completed events without feedback`);

    // Only proceed if there are completed events
    if (completedEvents && completedEvents.length > 0) {
      for (const event of completedEvents) {
        // Send feedback request for each completed event
        await fetch(`${supabaseUrl}/functions/v1/daily-checkin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'post-event',
            event_id: event.id,
            user_id: event.user_id,
            event_title: event.title
          })
        });

        // Mark feedback as sent
        await supabaseClient
          .from('event_feedback_status')
          .upsert({
            event_id: event.id,
            feedback_sent: true
          });
      }
    }

    return new Response(JSON.stringify({ status: 'success', events_processed: completedEvents?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in check-events function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
