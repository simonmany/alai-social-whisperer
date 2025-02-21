
export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  relationship?: string;
  interests?: string[];
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
}
