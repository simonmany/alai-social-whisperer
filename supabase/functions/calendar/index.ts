import { serve } from "std/http/server.ts"
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const validateEnv = () => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'EXTERNAL_GOOGLE_CLIENT_ID',
    'EXTERNAL_GOOGLE_SECRET',
  ];
  
  requiredVars.forEach(varName => {
    if (!Deno.env.get(varName)) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
};

const initSupabase = () => {
  validateEnv();
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

const handleListEvents = async (
  user: any,
  accessToken: string,
  { timeMin, timeMax }: { timeMin: string; timeMax: string }
) => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime'
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${await response.text()}`);
  }

  const data = await response.json();
  const events = (data.items || []).map((event: CalendarEvent) => ({
    user_id: user.id,
    google_event_id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description,
    start_time: event.start?.dateTime || event.start?.date,
    end_time: event.end?.dateTime || event.end?.date,
    updated_at: new Date().toISOString()
  }));

  const supabase = initSupabase();
  const { error } = await supabase
    .from('calendar_events')
    .upsert(events, { onConflict: 'google_event_id' });

  if (error) throw new Error('Database sync failed');

  return { events, synced_events: events.length };
};

const handleCreateEvent = async (
  user: any,
  accessToken: string,
  payload: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
  }
) => {
  const { title, description, start_time, end_time } = payload;
  
  const googleRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: start_time },
        end: { dateTime: end_time }
      })
    }
  );

  if (!googleRes.ok) {
    throw new Error(`Google API error: ${await googleRes.text()}`);
  }

  const createdEvent = await googleRes.json();
  const supabase = initSupabase();
  
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: user.id,
      google_event_id: createdEvent.id,
      title,
      description,
      start_time,
      end_time,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error('Database insertion failed');

  return { event: data };
};

const handleUpdateEvent = async (
  user: any,
  accessToken: string,
  payload: {
    google_event_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
  }
) => {
  const { google_event_id, title, description, start_time, end_time } = payload;
  
  const googleRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: start_time },
        end: { dateTime: end_time }
      })
    }
  );

  if (!googleRes.ok) {
    throw new Error(`Google API error: ${await googleRes.text()}`);
  }

  const supabase = initSupabase();
  const { error } = await supabase
    .from('calendar_events')
    .update({
      title,
      description,
      start_time,
      end_time,
      updated_at: new Date().toISOString()
    })
    .eq('google_event_id', google_event_id);

  if (error) throw new Error('Database update failed');

  return { message: 'Event updated' };
};

const handleDeleteEvent = async (
  user: any,
  accessToken: string,
  payload: { google_event_id: string }
) => {
  const { google_event_id } = payload;
  
  const googleRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!googleRes.ok) {
    throw new Error(`Google API error: ${await googleRes.text()}`);
  }

  const supabase = initSupabase();
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('google_event_id', google_event_id);

  if (error) throw new Error('Database deletion failed');

  return { message: 'Event deleted' };
};

const handleGoogleTokenRefresh = async (user: any) => {
  const supabase = initSupabase();
  const { data: { session }, error } = await supabase.auth.refreshSession({
    refresh_token: user.app_metadata.refresh_token
  });

  if (error || !session?.provider_token) {
    throw new Error('Failed to refresh Google token');
  }

  return session.provider_token;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabase = initSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...payload } = await req.json();
    const accessToken = await handleGoogleTokenRefresh(user);

    let result;
    switch (action) {
      case 'list': {
        const { timeMin, timeMax } = payload;
        if (!timeMin || !timeMax) {
          throw new Error('Missing timeMin/timeMax parameters');
        }
        result = await handleListEvents(user, accessToken, { timeMin, timeMax });
        break;
      }
      case 'create': {
        const { title, start_time, end_time } = payload;
        if (!title || !start_time || !end_time) {
          throw new Error('Missing required fields for event creation');
        }
        result = await handleCreateEvent(user, accessToken, {
          title,
          description: payload.description,
          start_time,
          end_time
        });
        break;
      }
      case 'update': {
        const { google_event_id, title, start_time, end_time } = payload;
        if (!google_event_id || !title || !start_time || !end_time) {
          throw new Error('Missing required fields for event update');
        }
        result = await handleUpdateEvent(user, accessToken, {
          google_event_id,
          title,
          description: payload.description,
          start_time,
          end_time
        });
        break;
      }
      case 'delete': {
        const { google_event_id } = payload;
        if (!google_event_id) {
          throw new Error('Missing google_event_id for deletion');
        }
        result = await handleDeleteEvent(user, accessToken, { google_event_id });
        break;
      }
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(
      JSON.stringify({ status: 'success', ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error(`[${new Date().toISOString()}] Error:`, error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.message.includes('auth') ? 'UNAUTHENTICATED' : 'INTERNAL_ERROR'
      }),
      { 
        status: error.message.includes('auth') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
