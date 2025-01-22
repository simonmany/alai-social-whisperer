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

    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Error getting user:', userError);
      throw new Error('Invalid session');
    }

    console.log('3. Successfully verified user:', user.id);

    // Get request body
    const { action, timeMin, timeMax, access_token } = await req.json();
    
    if (!access_token) {
      throw new Error('No Google access token provided');
    }

    if (action === 'list') {
      console.log('4. Fetching events from Google Calendar API');
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('5. Google Calendar API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Calendar API error:', errorText);
        throw new Error(`Google Calendar API error: ${errorText}`);
      }

      const data = await response.json();
      console.log('6. Retrieved events from Google Calendar:', data.items?.length);

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

      console.log('7. Successfully transformed events data');

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