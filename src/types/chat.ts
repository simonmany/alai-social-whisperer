import { Contact } from "./contacts";
import { CalendarEvent } from "./calendar";

export interface Message {
  content: string;
  isAl: boolean;
  is_secret?: boolean;
  contactInfo?: Contact;
  showPlanningForm?: boolean;
  showFeedbackForm?: boolean;
  onPlanningSubmit?: (message: string) => void;
  onFeedbackSubmit?: (message: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
  eventId?: string;
  eventTitle?: string;
  completedEvent?: CalendarEvent;
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
}