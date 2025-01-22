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
    console.log('1. Starting calendar function execution');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('2. Supabase client initialized');

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    console.log('3. Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('4. Token extracted from auth header');

    // Get the user session which includes the provider token
    console.log('5. Attempting to get session with token');
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession(token);
    console.log('6. Session response received');
    console.log('   Session present:', !!session);
    console.log('   Session error:', sessionError);
    
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError);
      throw new Error('Invalid session');
    }

    console.log('7. Successfully retrieved session for user:', session.user.id);

    // Get the provider token directly from the session
    const providerToken = session.provider_token;
    console.log('8. Provider token present:', !!providerToken);
    
    if (!providerToken) {
      console.error('No provider token found in session');
      throw new Error('No Google OAuth token available. Please reconnect your Google Calendar.');
    }

    console.log('9. Successfully retrieved provider token');

    const { action, timeMin, timeMax } = await req.json();
    console.log('10. Calendar function called with action:', action);
    console.log('    Time range:', { timeMin, timeMax });

    if (action === 'list') {
      console.log('11. Fetching events from Google Calendar API');
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('12. Google Calendar API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Calendar API error:', errorText);
        throw new Error(`Google Calendar API error: ${errorText}`);
      }

      const data = await response.json();
      console.log('13. Retrieved events from Google Calendar:', data.items?.length);

      // Transform events to our format
      const events = data.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description,
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        google_event_id: event.id,
        user_id: session.user.id,
      })) || [];

      console.log('14. Successfully transformed events data');

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
        status: isAuthError ? 401 : 500,
      }
    );
  }
});