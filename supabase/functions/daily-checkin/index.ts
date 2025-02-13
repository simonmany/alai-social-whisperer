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
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      throw new Error('Missing environment variables');
    }

    console.log('Creating Supabase client with URL:', supabaseUrl);
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    const { type, event_id, user_id, event_title } = requestBody;
    console.log('Check-in type:', type, 'User ID:', user_id);

    if (!user_id) {
      console.error('Missing user_id in request');
      throw new Error('Missing user_id in request');
    }

    // Get user's profile for timezone
    console.log('Fetching profile for user:', user_id);
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, display_name, city')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    // Get timezone from RPC function
    console.log('Getting timezone for city:', profile.city);
    const { data: userTimezone, error: timezoneError } = await supabaseClient
      .rpc('get_timezone_for_city', { city_name: profile.city || 'UTC' });

    if (timezoneError) {
      console.error('Error getting timezone:', timezoneError);
      throw timezoneError;
    }

    console.log('User timezone:', userTimezone);

    // Function to check if it's within the hour range
    const isWithinHourRange = (hour: number, currentTime: Date): boolean => {
      // For testing purposes, always return true
      // In production, uncomment the actual time check
      return true;
    };

    let message = '';
    if (type === 'morning' || type === 'evening') {
      const userTime = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
      
      const isRightTime = type === 'morning' 
        ? isWithinHourRange(7, userTime)  // 7 AM
        : isWithinHourRange(22, userTime); // 10 PM

      if (!isRightTime) {
        console.log(`Skipping ${type} message - not the right time in ${userTimezone}`);
        return new Response(JSON.stringify({ status: 'skipped', reason: 'not the right time' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (type === 'morning') {
        // Get today's events
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data: events, error: eventsError } = await supabaseClient
          .from('calendar_events')
          .select('*')
          .eq('user_id', user_id)
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
          .order('start_time', { ascending: true });

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
          throw eventsError;
        }

        message = `You're doing the morning check-in for your user. What they have scheduled for today is: ${
          events && events.length > 0 
            ? events.map(e => e.title).join(', ')
            : 'no scheduled events'
        }. Summarize these events succinctly, and highlight any availabilities. Suggest potential activities to fill these availabilities, taking into account the user's interests, goals, and contacts.`;

      } else {
        // For evening check-in, get both past and upcoming events for today
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // Get past events for today
        const { data: pastEvents, error: pastEventsError } = await supabaseClient
          .from('calendar_events')
          .select('*')
          .eq('user_id', user_id)
          .gte('start_time', startOfDay.toISOString())
          .lt('end_time', now.toISOString())
          .order('start_time', { ascending: true });

        if (pastEventsError) {
          console.error('Error fetching past events:', pastEventsError);
          throw pastEventsError;
        }

        // Get upcoming events for the rest of today
        const { data: upcomingEvents, error: upcomingEventsError } = await supabaseClient
          .from('calendar_events')
          .select('*')
          .eq('user_id', user_id)
          .gte('start_time', now.toISOString())
          .lt('start_time', endOfDay.toISOString())
          .order('start_time', { ascending: true });

        if (upcomingEventsError) {
          console.error('Error fetching upcoming events:', upcomingEventsError);
          throw upcomingEventsError;
        }

        message = `You're doing the evening recap with your user. Today, they'd scheduled ${
          pastEvents && pastEvents.length > 0 
            ? pastEvents.map(e => e.title).join(', ')
            : 'no events'
        }; tonight, they still have ${
          upcomingEvents && upcomingEvents.length > 0
            ? upcomingEvents.map(e => e.title).join(', ')
            : 'no remaining events'
        } on the calendar. Ask them how their day was, referencing and commenting upon specific events. Consider the context of their relationship with any attendees at these events, and their interests and progression along those interests.

Ask the user for their rose, bud, and thorn of the day.

Your goal is to better understand the user's likes and dislikes across people, activities, etc.`;
      }
    } else if (type === 'post-event' && event_id && event_title) {
      // Get event details including attendees
      const { data: eventDetails, error: eventError } = await supabaseClient
        .from('calendar_events')
        .select(`
          *,
          event_attendees!inner (
            contacts!contact_id (
              id,
              name
            )
          )
        `)
        .eq('id', event_id)
        .single();

      if (eventError) {
        console.error('Error fetching event details:', eventError);
        throw eventError;
      }

      const attendees = eventDetails.event_attendees?.map((ea: any) => ea.contacts.name).join(', ');
      const location = eventDetails.location ? ` at ${eventDetails.location}` : '';
      
      message = `The user just completed ${event_title}${attendees ? ` with ${attendees}` : ''}${location}. Ask them how it went, what they enjoyed about it, and whether they learned anything new about their friends. Try to understand their experience and preferences to provide better recommendations in the future.`;
    }

    // Route through the chat function
    console.log('Routing through chat function with message:', message);
    const { data: chatResponse, error: chatError } = await supabaseClient.functions.invoke('chat', {
      body: { message, userId: user_id }
    });

    if (chatError) {
      console.error('Error calling chat function:', chatError);
      throw chatError;
    }

    console.log('Chat function response:', chatResponse);

    // Verify the message was stored
    const { data: chatHistory, error: historyError } = await supabaseClient
      .from('chat_history')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (historyError) {
      console.error('Error verifying chat history:', historyError);
    } else {
      console.log('Latest chat history entry:', chatHistory);
    }

    console.log('Successfully processed check-in');
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
