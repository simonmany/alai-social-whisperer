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
  }