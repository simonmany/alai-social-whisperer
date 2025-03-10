import { Contact } from "./contacts";
import { CalendarEvent } from "./calendar";

export interface Message {
  id?: string;
  content: string;
  isAl: boolean;
  is_secret?: boolean;
  contactInfo?: Contact;
  showPlanningForm?: boolean;
  showFeedbackForm?: boolean;
  onPlanningSubmit?: (message: string) => void;
  onFeedbackSubmit?: (message: string, event?: CalendarEvent, mood?: string[], notes?: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
  eventId?: string;
  eventTitle?: string;
  completedEvent?: CalendarEvent;
  typewriterPlayed?: boolean;
  messageType?: "morning" | "evening" | "post-event";
  metadata?: any;
  // Multi-step feedback form properties
  feedbackStep?: "event-selection" | "mood-selection" | "notes-input" | "complete";
  showMoodSelection?: boolean;
  showNotesInput?: boolean;
  selectedEvent?: CalendarEvent;
  selectedMoods?: string[];
  feedbackNotes?: string;
}

export interface SuggestedPromptItem {
  text: string;
  action: string;
}

export interface ChatHistoryMessage {
  message: string;
  is_ai: boolean;
  is_secret: boolean;
  user_id: string;
  id: string;
  created_at: string;
  evening_checkin: boolean;
  morning_checkin: boolean;
  is_onboarding_message: boolean;
  event_id?: string;
  event_title?: string;
  typewriter_played?: boolean;
  feedback_sent?: boolean;
}