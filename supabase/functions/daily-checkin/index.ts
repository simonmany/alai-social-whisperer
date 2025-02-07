
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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    console.log('Creating Supabase client with URL:', supabaseUrl);
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { type, event_id, user_id, event_title } = await req.json();
    console.log('Check-in type:', type);

    // Function to check if it's within the hour range for a specific time in user's timezone
    const isWithinHourRange = (hour: number, currentTime: Date): boolean => {
      // We'll consider a message valid if it's within 30 minutes of the target hour
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      
      return currentHour === hour && currentMinute < 30;
    };

    if (type === 'morning' || type === 'evening') {
      // Get all users and their events for today
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, display_name, city');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`Processing ${type} check-in for ${profiles?.length || 0} profiles`);

      for (const profile of profiles || []) {
        // We'll use the user's city to determine their timezone
        // In a production environment, you'd want to store the timezone explicitly
        // This is a simplified example
        const userCity = profile.city || 'UTC';
        const userTime = new Date(new Date().toLocaleString('en-US', { timeZone: userCity }));
        
        // Check if it's the right time in the user's timezone
        const isRightTime = type === 'morning' 
          ? isWithinHourRange(7, userTime)  // 7 AM
          : isWithinHourRange(22, userTime); // 10 PM

        if (!isRightTime) {
          console.log(`Skipping ${type} message for ${profile.display_name} - not the right time in ${userCity}`);
          continue;
        }

        if (type === 'morning') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const { data: events, error: eventsError } = await supabaseClient
            .from('calendar_events')
            .select('*')
            .eq('user_id', profile.id)
            .gte('start_time', today.toISOString())
            .lt('start_time', tomorrow.toISOString())
            .order('start_time', { ascending: true });

          if (eventsError) {
            console.error('Error fetching events:', eventsError);
            continue;
          }

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

            const { error: insertError } = await supabaseClient
              .from('chat_history')
              .insert([
                { user_id: profile.id, message, is_ai: true }
              ]);

            if (insertError) {
              console.error('Error inserting chat message:', insertError);
            }
          }
        } else if (type === 'evening') {
          const message = "Hey! Let's reflect on your day:\n\n" +
            "🌹 What was your rose (highlight) of the day?\n" +
            "🪴 What was your bud (something you're looking forward to)?\n" +
            "🌱 What was your thorn (something that could have gone better)?";
            
          const { error: insertError } = await supabaseClient
            .from('chat_history')
            .insert([
              { user_id: profile.id, message, is_ai: true }
            ]);

          if (insertError) {
            console.error('Error inserting chat message:', insertError);
          }
        }
      }
    } else if (type === 'post-event' && event_id && user_id) {
      // Send post-event check-in message
      console.log(`Processing post-event check-in for event: ${event_title}`);
      
      const message = `Hey! How was ${event_title}? I'd love to hear about it:\n\n` +
        "• What did you enjoy most?\n" +
        "• Did you learn anything new?\n" +
        "• Would you like to do something similar again?";
        
      const { error: insertError } = await supabaseClient
        .from('chat_history')
        .insert([
          { user_id, message, is_ai: true }
        ]);

      if (insertError) {
        console.error('Error inserting chat message:', insertError);
      }
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
