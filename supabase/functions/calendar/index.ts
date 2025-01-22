import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // First verify the JWT is valid and get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      throw new Error('Invalid authorization token');
    }

    console.log('Successfully verified user token for:', user.id);

    // Get the session to access the provider token
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession(token);
    
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError);
      throw new Error('Invalid session');
    }

    console.log('Successfully retrieved session');

    // Get the provider token from the session
    const providerToken = session.provider_token;
    if (!providerToken) {
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
            'Authorization': `Bearer ${providerToken}`,
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

      // Transform events to our format
      const events = data.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description,
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        google_event_id: event.id,
        user_id: user.id,
      })) || [];

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
    
    // Determine if this is an auth error
    const isAuthError = error.message.includes('auth') || 
                       error.message.includes('token') || 
                       error.message.includes('session');
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: isAuthError ? 
          'Please try reconnecting your Google Calendar' : 
          'An error occurred while fetching your calendar events'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});