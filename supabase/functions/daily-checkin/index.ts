import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { stringifyJSON } from '../_shared/utils.ts';
import { convertToLocalTime } from "../_shared/utils.ts";
import { supabase } from '../_shared/supabase.ts';

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

    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    const { type, event_id, user_id, event_title } = requestBody;
    console.log('Check-in type:', type, 'User ID:', user_id);

    if (!user_id) {
      console.error('Missing user_id in request');
      throw new Error('Missing user_id in request');
    }

    // Get user's profile for timezone, goals, and catch-up contacts
    console.log('Fetching profile for user:', user_id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, city, goals, utc_offset_minutes, catch_up_contacts')
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
        const { data, error: eventsError } = await supabase
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

        // First, fetch catch-up contacts if any are specified
        let catchUpContacts = [];
        if (profile.catch_up_contacts?.length > 0) {
          const { data: catchUpData, error: catchUpError } = await supabase
            .from('contacts')
            .select('id, name, closeness, interests, relationship, meeting_story')
            .eq('user_id', user_id)
            .in('id', profile.catch_up_contacts);

          if (catchUpError) {
            console.error('Error fetching catch-up contacts:', catchUpError);
          } else {
            catchUpContacts = catchUpData || [];
          }
        }

        // Then fetch other close contacts as backup suggestions
        let query = supabase
          .from('contacts')
          .select('id, name, closeness, interests, relationship, meeting_story')
          .eq('user_id', user_id)
          .gt('closeness', 0.6);  // Get friends and close friends

        // Only add the not.in filter if we have catch-up contacts to exclude
        if (profile.catch_up_contacts?.length > 0) {
          query = query.not('id', 'in', `(${profile.catch_up_contacts.join(',')})`);
        }

        const { data: closeContacts, error: contactsError } = await query.order('closeness', { ascending: false});

        if (contactsError) {
          console.error('Error fetching priority contacts:', contactsError);
          throw contactsError;
        }

        message = `You are doing the morning check-in for your user. Use minimal spacing in your response.
### Today's Schedule
${events && events.length > 0 ? 'Your events today:' : 'No scheduled events today.'}
${events && events.length > 0 ? events.map((e, i) => `${i + 1}. ${e.title} - Hangout with ${e.attendees?.map(a => a.name).join(', ')} from ${new Date(e.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} to ${new Date(e.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`).join('\n') : ''}

### Availabilities
Time slots 1 hour or longer. For each slot, I'll suggest activities prioritizing:
- Your goals: ${stringifyJSON(goals)}
- Priority catch-ups: ${stringifyJSON(catchUpContacts)}
- Other close friends: ${stringifyJSON(closeContacts)}
- Your location: ${profile.city || 'Unknown'}

Format each availability as:
1. [Time Slot] (Duration)\n   - Suggestion 1\n   - Suggestion 2\n   - Suggestion 3${missingGoalsPrompt}

### Reminders
Prep needed for today's events:`;
      } else {
        const { data: pastData, error: pastEventsError } = await supabase
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
        const { data: upcomingData, error: upcomingEventsError } = await supabase
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

        message = `You're doing the evening recap with your user.
Type: evening

Today, they'd scheduled ${
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
      console.log('Processing post-event request for event:', event_id);
      
      // Get event details including attendees
      const { data: eventDetails, error: eventError } = await supabase
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
    console.log('Invoking chat function with:', { 
      message: message.substring(0, 100) + '...', 
      userId: user_id,
      type,
      event_id,
      event_title
    });

    console.log('Invoking chat function with type:', type);
    const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat', {
      body: { 
        message, 
        userId: user_id, 
        secretMessage: false, 
        conversationType: "DAILY_CHECKIN",
        event_id: type === 'post-event' ? event_id : undefined,
        event_title: type === 'post-event' ? event_title : undefined,
        completedEvent: type === 'post-event' ? requestBody.event : undefined,
        checkinType: type === 'morning' ? 'morning' : type === 'evening' ? 'evening' : type
      }
    });

    if (chatError) {
      console.error('Error calling chat function:', chatError);
      throw chatError;
    }

    console.log('Chat function response:', chatResponse);

    // Send push notification if this is a morning checkin
    if (chatResponse.response.text && type === 'morning') {
      try {
        console.log('Sending push notification for morning check-in');
        
        // Get user's push tokens from the database
        const { data: pushTokens, error: pushTokenError } = await supabase
          .from('user_push_tokens')
          .select('push_token, device_type')
          .eq('user_id', user_id);
        
        if (pushTokenError) {
          console.error('Error fetching push tokens:', pushTokenError);
        } else if (pushTokens && pushTokens.length > 0) {
          console.log(`Found ${pushTokens.length} push tokens for user ${user_id}`);
          
          // Truncate message to a reasonable length for a notification (120 chars)
          const truncatedMessage = chatResponse.response.text.length > 120 
            ? chatResponse.response.text.substring(0, 117) + '...' 
            : chatResponse.response.text;
          
          // For each token, send a push notification
          for (const tokenData of pushTokens) {
            // Prepare notification payload
            const notificationPayload = {
              token: tokenData.push_token,
              notification: {
                title: 'Your Morning Check-in',
                body: truncatedMessage
              },
              data: {
                type: 'morning_message',
                messageId: chatResponse.response.messageId || '',
                deepLink: 'alai://app/home'  // Deep link to open the app
              }
            };
            
            // Send the notification
            supabase.functions.invoke('send-push', {
              body: notificationPayload
            });
            
            console.log(`Push notification sent to token: ${tokenData.push_token.substring(0, 10)}...`);
          }
        } else {
          console.log(`No push tokens found for user ${user_id}`);
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
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
