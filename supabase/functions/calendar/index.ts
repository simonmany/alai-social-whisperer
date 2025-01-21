import { createClient } from '@supabase/supabase-js';
import { serve } from 'https://deno.fresh.run/std@v9.6.1/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, event, eventId } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user's Google access token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Error getting user');
    }

    // Get the user's Google OAuth tokens
    // Note: This assumes you've stored the tokens in user metadata
    const accessToken = user.user_metadata.google_access_token;
    
    if (!accessToken) {
      throw new Error('No Google access token found');
    }

    const calendar = {
      async createEvent(event: GoogleCalendarEvent) {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          throw new Error(`Failed to create event: ${response.statusText}`);
        }

        return response.json();
      },

      async updateEvent(eventId: string, event: GoogleCalendarEvent) {
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          throw new Error(`Failed to update event: ${response.statusText}`);
        }

        return response.json();
      },

      async deleteEvent(eventId: string) {
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete event: ${response.statusText}`);
        }

        return true;
      },

      async listEvents(timeMin?: string, timeMax?: string) {
        const params = new URLSearchParams({
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
        });

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to list events: ${response.statusText}`);
        }

        return response.json();
      },
    };

    let result;
    console.log(`Processing calendar action: ${action}`);

    switch (action) {
      case 'create':
        result = await calendar.createEvent(event);
        break;
      case 'update':
        if (!eventId) throw new Error('Event ID is required for updates');
        result = await calendar.updateEvent(eventId, event);
        break;
      case 'delete':
        if (!eventId) throw new Error('Event ID is required for deletion');
        result = await calendar.deleteEvent(eventId);
        break;
      case 'list':
        result = await calendar.listEvents(event?.timeMin, event?.timeMax);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calendar function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});