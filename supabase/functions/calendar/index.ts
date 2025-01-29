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
    console.log('1. Starting calendar function execution');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('2. Supabase client initialized');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Error getting user:', userError);
      throw new Error('Invalid session');
    }

    console.log('3. Successfully verified user:', user.id);

    // Get the user's Google OAuth token
    let accessToken;
    if (user.app_metadata?.providers?.includes('google')) {
      console.log(`refresh token present: ${user.app_metadata.refresh_token}`);
      const { data: { session }, error: refreshError } = await supabaseClient.auth.refreshSession({
        refresh_token: user.app_metadata.refresh_token,
      });

      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to refresh Google access token',
            type: 'auth_error'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }

      accessToken = session?.provider_token;
      console.log('4. Retrieved Google access token');
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Calendar not connected',
          type: 'auth_error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const { action, timeMin, timeMax } = await req.json();

    if (action === 'list') {
      console.log('5. Fetching events from Google Calendar API');
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('6. Google Calendar API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Calendar API error:', errorText);
        return new Response(
          JSON.stringify({ 
            error: `Google Calendar API error: ${errorText}`,
            type: 'api_error'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
          }
        );
      }

      const data = await response.json();
      console.log('7. Retrieved events from Google Calendar:', data.items?.length);

      // Transform events for database storage
      const calendarEvents = data.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description,
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        google_event_id: event.id,
        user_id: user.id,
        last_synced: new Date().toISOString(),
      })) || [];

      console.log('8. Upserting events in database');

      // Upsert events using google_event_id as the conflict key
      const { error: upsertError } = await supabaseClient
        .from('calendar_events')
        .upsert(calendarEvents, {
          onConflict: 'google_event_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error upserting events:', upsertError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to store calendar events',
            type: 'db_error'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      console.log('9. Successfully upserted', calendarEvents.length, 'events');

      // Clean up old events that weren't in this sync
      const { error: cleanupError } = await supabaseClient
        .from('calendar_events')
        .delete()
        .eq('user_id', user.id)
        .lt('last_synced', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (cleanupError) {
        console.error('Warning: Error cleaning up old events:', cleanupError);
      }

      return new Response(
        JSON.stringify({ 
          events: calendarEvents,
          message: `Successfully synced ${calendarEvents.length} events`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error(`Unsupported action: ${action}`);
  } catch (error) {
    console.error('Error in calendar function:', error);
    
    const isAuthError = error.message.includes('auth') || 
                       error.message.includes('token') || 
                       error.message.includes('session');
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: isAuthError ? 'auth_error' : 'general_error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isAuthError ? 401 : 500,
      }
    );
  }
});
