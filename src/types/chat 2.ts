import { Contact } from "./contacts";

export interface Message {
    content: string;
    isAl: boolean;
    is_secret?: boolean;
    contactInfo?: Contact;
  }