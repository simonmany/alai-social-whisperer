/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    // Get the session token
    const sessionToken = authHeader.replace('Bearer ', '');

    // Initialize Supabase client
    const supabase = createClient(
      'https://ejqucnzpgebbujlnmdzx.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user and metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    if (authError || !user) {
      throw new Error('Invalid session');
    }

    // Parse request body
    const { action, timeMin, timeMax, google_token } = await req.json();

    // Log request details
    console.log('Calendar request:', {
      action,
      timeMin,
      timeMax,
      hasToken: !!google_token,
      userId: user.id
    });

    // Validate required fields
    if (!action) throw new Error('Missing action');
    if (!google_token) throw new Error('Missing Google token');
    if (action === 'list' && (!timeMin || !timeMax)) {
      throw new Error('Missing timeMin/timeMax for list action');
    }

    // Log the token being used (first 10 chars only for security)
    console.log('Calendar API Request:', {
      tokenPreview: google_token ? `${google_token.substring(0, 10)}...` : 'none',
      tokenLength: google_token?.length,
      timeMin,
      timeMax
    });

    // Make request to Google Calendar API
    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    
    // Log full request details
    console.log('Making Calendar API request:', {
      url: calendarUrl,
      hasToken: !!google_token,
      tokenLength: google_token?.length
    });

    const response = await fetch(calendarUrl, {
      headers: {
        'Authorization': `Bearer ${google_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Try to parse the error response
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { raw: errorText };
      }

      // Log detailed error information
      console.error('Google Calendar API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: parsedError,
        requestDetails: {
          url: calendarUrl,
          tokenLength: google_token?.length,
          tokenPreview: google_token ? `${google_token.substring(0, 10)}...` : 'none'
        }
      });

      // Pass through the error from Google Calendar API with more details
      return new Response(
        JSON.stringify({
          error: 'Google Calendar API error',
          type: response.status === 401 ? 'auth_error' : 'api_error',
          details: parsedError,
          requestInfo: {
            status: response.status,
            statusText: response.statusText
          }
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log successful response
    console.log('Google Calendar API request successful');

    const data = await response.json();
    
    // Log the raw response data
    console.log('Calendar API response:', {
      itemCount: data.items?.length,
      hasItems: !!data.items,
      firstItem: data.items?.[0] ? {
        id: data.items[0].id,
        summary: data.items[0].summary,
        hasStart: !!data.items[0].start,
        hasEnd: !!data.items[0].end
      } : null
    });

    // Handle empty events list
    if (!data.items || !Array.isArray(data.items)) {
      console.log('No events found in response');
      return new Response(
        JSON.stringify({ success: true, events: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Transform events
    const events = data.items.map((event: any) => {
      // Parse dates to ensure they're valid timestamps
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;
      
      return {
        user_id: user.id,
        google_event_id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || null,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // Log the transformed events
    console.log('Transformed events:', {
      count: events.length,
      firstEvent: events[0] ? {
        id: events[0].google_event_id,
        title: events[0].title,
        start: events[0].start_time,
        end: events[0].end_time
      } : null
    });

    // Only attempt database save if we have events
    if (events.length > 0) {
      // Save to database
      const { error: dbError } = await supabase
        .from('calendar_events')
        .upsert(events, { onConflict: 'google_event_id' });

      if (dbError) {
        console.error('Database error:', {
          error: dbError,
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        throw new Error(`Failed to save events to database: ${dbError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, events }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Calendar function error:', err);
    const error = err instanceof Error ? err : new Error('Unknown error');
    
    let errorResponse;
    try {
      errorResponse = JSON.parse(error.message);
    } catch {
      errorResponse = {
        message: error.message,
        code: 'INTERNAL_ERROR',
        details: error.stack
      };
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: errorResponse.type === 'auth_error' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
