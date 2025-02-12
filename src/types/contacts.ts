export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meeting_story?: string;
  relationship?: string;
  closeness?: number;
  interests?: string[];
  is_archived?: boolean;
  created_at?: string;
  user_id?: string;
  photo?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  google_event_id?: string | null;
  location?: string | null;
}

export interface ContactEvent extends CalendarEvent {
  attendees?: Contact[];
}
