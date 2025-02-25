import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { stringifyJSON } from '../_shared/utils.ts';
import { convertToLocalTime } from "../_shared/utils.ts";

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

    // Get user's profile for timezone and goals
    console.log('Fetching profile for user:', user_id);
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, display_name, city, goals, utc_offset_minutes')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    // Check for missing goals
    const goals = profile.goals || [];
    const hasEmptyGoals = goals.some((goal: any) => !goal.target || !goal.timeframe);
    const missingGoalsPrompt = hasEmptyGoals ? "\n\nI notice you have some incomplete goals. Would you like to take a moment to set some specific targets for your social connections?" : "";

    let message = '';
    if (type === 'morning' || type === 'evening') {
      // Get the user's current time using their UTC offset
      const now = new Date();
      const userTime = new Date(now.getTime() + (profile.utc_offset_minutes || 0) * 60000);
      const userHour = userTime.getUTCHours();
      
      // Check if it's the right time of day (7-9 AM for morning, 8-11 PM for evening)
      const isRightTime = type === 'morning' 
        ? userHour >= 7 && userHour < 9
        : userHour >= 20 && userHour < 23;

      // if (!isRightTime) {
      //   console.log(`Skipping ${type} message - not the right time for user`);
      //   return new Response(JSON.stringify({ status: 'skipped', reason: 'not the right time' }), {
      //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      //   });
      // }

      // Get today's events using user's UTC offset for date boundaries
      const userLocalTime = new Date(now.getTime() + (profile.utc_offset_minutes || 0) * 60000);
      const startOfDay = new Date(userLocalTime);
      startOfDay.setHours(0, 0, 0, 0);  // Set to midnight in local time
      const startOfDayUTC = new Date(startOfDay.getTime() - (profile.utc_offset_minutes || 0) * 60000);
      const endOfDay = new Date(userLocalTime);
      endOfDay.setHours(23, 59, 59, 999);  // Set to end of day in local time
      const endOfDayUTC = new Date(endOfDay.getTime() - (profile.utc_offset_minutes || 0) * 60000);
  
      if (type === 'morning') {
        const { data, error: eventsError } = await supabaseClient
          .from('calendar_events')
          .select('title, description, start_time, end_time')
          .eq('user_id', user_id)
          .gte('start_time', startOfDayUTC.toISOString())
          .lt('start_time', endOfDayUTC.toISOString())
          .order('start_time', { ascending: true });

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
          throw eventsError;
        }
        const events = data?.map(event => ({
          ...event,
          start_time: convertToLocalTime(event.start_time, profile.utc_offset_minutes),
          end_time: convertToLocalTime(event.end_time, profile.utc_offset_minutes)
        })) || [];        

        message = `You're doing the morning check-in for your user. What they have scheduled for today is: ${
          events && events.length > 0 
            ? events.map(e => stringifyJSON(e)).join(', ')
            : 'no scheduled events'
        }. Summarize these events succinctly, and highlight any availabilities. Suggest potential activities to fill these availabilities, taking into account the user's interests, goals, and contacts.${missingGoalsPrompt}`;
      } else {
        const { data: pastData, error: pastEventsError } = await supabaseClient
          .from('calendar_events')
          .select('title, description, start_time, end_time')
          .eq('user_id', user_id)
          .gte('start_time', startOfDayUTC.toISOString())  // Started today
          .lt('start_time', now.toISOString())  // Started before now
          .order('start_time', { ascending: true });

        if (pastEventsError) {
          console.error('Error fetching past events:', pastEventsError);
          throw pastEventsError;
        }
        const pastEvents = pastData?.map(event => ({
          ...event,
          start_time: convertToLocalTime(event.start_time, profile.utc_offset_minutes),
          end_time: convertToLocalTime(event.end_time, profile.utc_offset_minutes)
        })) || [];
        // Get upcoming events for the rest of today
        const { data: upcomingData, error: upcomingEventsError } = await supabaseClient
          .from('calendar_events')
          .select('title, description, start_time, end_time')
          .eq('user_id', user_id)
          .gte('start_time', now.toISOString())
          .lt('start_time', endOfDayUTC.toISOString())
          .order('start_time', { ascending: true });

        if (upcomingEventsError) {
          console.error('Error fetching upcoming events:', upcomingEventsError);
          throw upcomingEventsError;
        }

        const upcomingEvents = upcomingData?.map(event => ({
          ...event,
          start_time: convertToLocalTime(event.start_time, profile.utc_offset_minutes),
          end_time: convertToLocalTime(event.end_time, profile.utc_offset_minutes)
        })) || [];

        console.log('past events', pastEvents);
        console.log('upcoming events', upcomingEvents);
        message = `You're doing the evening recap with your user. Today, they'd scheduled ${
          pastEvents && pastEvents.length > 0 
            ? pastEvents.map(e => stringifyJSON(e)).join(', ')
            : 'no events'
        }; tonight, they still have ${
          upcomingEvents && upcomingEvents.length > 0
            ? upcomingEvents.map(e => stringifyJSON(e)).join(', ')
            : 'no remaining events'
        } on the calendar. Ask them how their day was, referencing and commenting upon specific events. Consider the context of their relationship with any attendees at these events, and their interests and progression along those interests.

Ask the user for their rose, bud, and thorn of the day.

Your goal is to better understand the user's likes and dislikes across people, activities, etc.${missingGoalsPrompt}`;
      }
    } else if (type === 'post-event' && event_id && event_title) {
      // Get event details including attendees
      const { data: eventDetails, error: eventError } = await supabaseClient
        .from('calendar_events')
        .select(`
          *,
          event_attendees!left (
            contacts!contact_id (
              id,
              name
            )
          )
        `)
        .eq('id', event_id)
        .maybeSingle();

      if (eventError) {
        console.error('Error fetching event details:', eventError);
        throw eventError;
      }

      if (!eventDetails) {
        console.error('Event not found:', event_id);
        return new Response(
          JSON.stringify({ 
            error: 'Event not found',
            details: `Could not find event with ID: ${event_id}`
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const attendees = eventDetails.event_attendees?.map((ea: any) => ea.contacts.name).join(', ');
      const location = eventDetails.location ? ` at ${eventDetails.location}` : '';
      
      message = `The user just completed ${event_title}${attendees ? ` with ${attendees}` : ''}${location}. Ask them how it went, what they enjoyed about it, and whether they learned anything new about their friends. Try to understand their experience and preferences to provide better recommendations in the future.${missingGoalsPrompt}`;
    }

    // Route through the chat function
    console.log('Routing through chat function with message:', message);
    const { data: chatResponse, error: chatError } = await supabaseClient.functions.invoke('chat', {
      body: { message, userId: user_id, secretMessage: false, conversationType: "DAILY_CHECKIN" }
    });

    if (chatError) {
      console.error('Error calling chat function:', chatError);
      throw chatError;
    }

    console.log('Chat function response:', chatResponse);

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
