
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
    console.log('Starting check-events function');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      throw new Error('Missing environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get completed events in the last 15 minutes that haven't had feedback sent
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    
    console.log('Checking for events completed between:', {
      start: fifteenMinutesAgo.toISOString(),
      end: now.toISOString()
    });

    // Find events that need feedback
    const { data: completedEvents, error: eventsError } = await supabaseClient
      .from('calendar_events')
      .select('id, title, user_id, end_time')
      .lt('end_time', now.toISOString())
      .gt('end_time', fifteenMinutesAgo.toISOString())
      .is('feedback_sent', false);

    if (eventsError) {
      console.error('Error fetching completed events:', eventsError);
      throw eventsError;
    }

    console.log(`Found ${completedEvents?.length || 0} completed events without feedback`);

    // Only proceed if there are completed events
    if (completedEvents && completedEvents.length > 0) {
      for (const event of completedEvents) {
        console.log(`Processing event: ${event.title} for user ${event.user_id}`);
        
        try {
          // Send AI message requesting feedback for each completed event
          console.log('Calling daily-checkin to request feedback');
          const response = await fetch(`${supabaseUrl}/functions/v1/daily-checkin`, {
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

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error requesting feedback for event ${event.id}:`, errorText);
            continue;
          }

          console.log(`Successfully requested feedback for event ${event.id}`);
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
        }
      }
    } else {
      console.log('No events requiring feedback found in the specified time window');
    }

    return new Response(JSON.stringify({ 
      status: 'success', 
      events_processed: completedEvents?.length || 0,
      time_window: {
        start: fifteenMinutesAgo.toISOString(),
        end: now.toISOString()
      }
    }), {
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
