export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    google_event_id?: string;
    location?: string;
    feedback_sent?: boolean;
    attendees?: Array<{
      id: string;
      name: string;
    }>;
  }

export interface CalendarData {
    events: CalendarEvent[];
    isConnected: boolean;
  }