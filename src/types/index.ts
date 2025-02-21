
export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
  user_id: string;
}

export interface Event {
  id: string;
  title: string;
  date: Date;
  location?: string;
  attendees?: Contact[];
}
