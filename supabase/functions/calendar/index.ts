import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user's session from the request authorization header
    const authHeader = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    // Get the user's session
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession(authHeader);
    if (sessionError || !sessionData.session) {
      console.error('Error getting user session:', sessionError);
      throw new Error('Error getting user session');
    }

    const { user, provider_token } = sessionData.session;
    if (!provider_token) {
      console.error('No provider token found in session');
      throw new Error('No Google OAuth token available. Please reconnect your Google Calendar.');
    }

    console.log('Successfully retrieved provider token');

    const { action, timeMin, timeMax } = await req.json();
    console.log('Calendar function called with action:', action);

    if (action === 'list') {
      console.log('Fetching events from Google Calendar API');
      console.log('Time range:', { timeMin, timeMax });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${provider_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Calendar API error:', errorText);
        throw new Error(`Google Calendar API error: ${errorText}`);
      }

      const data = await response.json();
      console.log('Retrieved events from Google Calendar:', data.items?.length);

      // Transform and store events in Supabase
      const events = data.items?.map((event: any) => ({
        title: event.summary || 'Untitled Event',
        description: event.description,
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        google_event_id: event.id,
        user_id: user.id,
      })) || [];

      // Store events in Supabase
      if (events.length > 0) {
        const { error: upsertError } = await supabaseClient
          .from('calendar_events')
          .upsert(events, { 
            onConflict: 'google_event_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error storing events in Supabase:', upsertError);
          throw upsertError;
        }

        console.log('Successfully stored events in Supabase');
      } else {
        console.log('No events to store');
      }

      return new Response(
        JSON.stringify({ events }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error(`Unsupported action: ${action}`);
  } catch (error) {
    console.error('Error in calendar function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'If this is a token error, please try reconnecting your Google Calendar'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});