
export interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  relationship?: string | null;
  interests?: string[] | null;
  notes?: string | null;
  last_contact?: string | null;
  contact_frequency?: number | null;
  user_id: string;
  created_at: string;
  is_archived?: boolean | null;
  meetingStory?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  closeness?: number | null;
  photo?: string | null;
}

export interface ContactEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}
