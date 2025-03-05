
export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  relationship?: string;
  interests?: any;
  notes?: string;
  last_contact?: string;
  contact_frequency?: number;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  is_archived?: boolean;
  custom_fields?: Record<string, any>;
  meetingStory?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  closeness?: number;
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
