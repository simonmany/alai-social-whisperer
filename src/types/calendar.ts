import { Contact } from "./contacts";
export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    google_event_id?: string;
    location?: string;
    feedback_sent?: boolean;
    attendees?: Array<Contact>;
    all_day: boolean;
  }

export interface CalendarData {
    events: CalendarEvent[];
    isConnected: boolean;
  }