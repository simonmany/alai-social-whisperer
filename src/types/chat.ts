import { Contact } from "./contacts";

export interface Message {
  content: string;
  isAl: boolean;
  is_secret?: boolean;
  contactInfo?: Contact;
  showPlanningForm?: boolean;
  onPlanningSubmit?: (message: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
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
}