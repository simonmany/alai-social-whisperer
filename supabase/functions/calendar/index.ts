import { createClient, SupabaseClient } from '@supabase/supabase-js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

type CalendarAction = 'list' | 'create' | 'update' | 'delete';

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface CustomRequest extends Request {
  user?: any;
  headers: Record<string, string | string[] | undefined>;
  body: {
    action: CalendarAction;
    timeMin?: string;
    timeMax?: string;
    [key: string]: any;
  };
}

// Validate environment variables
const validateEnv = () => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'EXTERNAL_GOOGLE_CLIENT_ID',
    'EXTERNAL_GOOGLE_SECRET',
    'GOOGLE_CALENDAR_REDIRECT_URI'
  ];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
};

const initSupabase = (): SupabaseClient => {
  validateEnv();
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));

// Authentication middleware
const authenticateUser = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
      
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabase = initSupabase();
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unified error handler
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  
  const statusCode = err.message.includes('auth') ? 401 : 500;
  res.status(statusCode).json({
    error: err.message,
    code: statusCode === 401 ? 'UNAUTHENTICATED' : 'INTERNAL_ERROR'
  });
};

app.use(authenticateUser);

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

app.post('/', async (req: CustomRequest, res: Response) => {
  try {
    const { action, ...payload } = req.body;
    const user = req.user!;

    const accessToken = await handleGoogleTokenRefresh(user);

    switch (action) {
      case 'list': {
        const { timeMin, timeMax } = payload;
        if (!timeMin || !timeMax) {
          throw new Error('Missing timeMin/timeMax parameters');
        }
        return handleListEvents(res, user, accessToken, { timeMin, timeMax });
      }
      case 'create': {
        const { title, start_time, end_time } = payload;
        if (!title || !start_time || !end_time) {
          throw new Error('Missing required fields for event creation');
        }
        return handleCreateEvent(res, user, accessToken, {
          title,
          description: payload.description,
          start_time,
          end_time
        });
      }
      case 'update': {
        const { google_event_id, title, start_time, end_time } = payload;
        if (!google_event_id || !title || !start_time || !end_time) {
          throw new Error('Missing required fields for event update');
        }
        return handleUpdateEvent(res, user, accessToken, {
          google_event_id,
          title,
          description: payload.description,
          start_time,
          end_time
        });
      }
      case 'delete': {
        const { google_event_id } = payload;
        if (!google_event_id) {
          throw new Error('Missing google_event_id for deletion');
        }
        return handleDeleteEvent(res, user, accessToken, { google_event_id });
      }
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (err) {
    errorHandler(err instanceof Error ? err : new Error('Unknown error'), req, res, () => {});
  }
});

// Event handlers
const handleListEvents = async (
  res: Response,
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
  const events = (data.items || []).map((event: GoogleCalendarEvent) => ({
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

  res.json({
    status: 'success',
    synced_events: events.length,
    events
  });
};

const handleCreateEvent = async (
  res: Response,
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

  res.status(201).json({
    status: 'success',
    event: data
  });
};

const handleUpdateEvent = async (
  res: Response,
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

  res.json({
    status: 'success',
    message: 'Event updated'
  });
};

const handleDeleteEvent = async (
  res: Response,
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

  res.json({
    status: 'success',
    message: 'Event deleted'
  });
};

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Calendar service running on port ${PORT}`);
});
