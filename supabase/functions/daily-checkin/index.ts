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
    console.log('Starting daily check-in function');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, event_id, user_id, event_title } = await req.json();
    console.log('Check-in type:', type);

    if (type === 'morning') {
      // Get all users and their events for today
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, display_name');

      for (const profile of profiles || []) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: events } = await supabaseClient
          .from('calendar_events')
          .select('*')
          .eq('user_id', profile.id)
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
          .order('start_time', { ascending: true });

        if (events && events.length > 0) {
          // Find gaps in schedule (>2 hours)
          const gaps = [];
          for (let i = 0; i < events.length - 1; i++) {
            const currentEnd = new Date(events[i].end_time);
            const nextStart = new Date(events[i + 1].start_time);
            const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60); // hours

            if (gap >= 2) {
              gaps.push({
                start: currentEnd,
                end: nextStart,
                duration: gap
              });
            }
          }

          // Create morning message
          const message = `Good morning! Here's your schedule for today:\n\n${events.map(event => 
            `• ${event.title} (${new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
          ).join('\n')}\n\n${gaps.length > 0 ? `You have some free time slots:\n${gaps.map(gap => 
            `• ${gap.duration.toFixed(1)} hours between ${gap.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and ${gap.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          ).join('\n')}\n\nWould you like to plan any hangs during these times?` : ''}`;

          await supabaseClient
            .from('chat_history')
            .insert([
              { user_id: profile.id, message, is_ai: true }
            ]);
        }
      }
    } else if (type === 'evening') {
      // Send evening check-in message to all users
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id');

      for (const profile of profiles || []) {
        const message = "Hey! How was your day? I'd love to hear about it.";
        await supabaseClient
          .from('chat_history')
          .insert([
            { user_id: profile.id, message, is_ai: true }
          ]);
      }
    } else if (type === 'post-event' && event_id && user_id) {
      // Send post-event check-in message
      const message = `Hey! How was ${event_title}? I'd love to hear about it.`;
      await supabaseClient
        .from('chat_history')
        .insert([
          { user_id, message, is_ai: true }
        ]);
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in daily-checkin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});