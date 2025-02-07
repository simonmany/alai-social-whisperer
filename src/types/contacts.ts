export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meeting_story?: string;
  relationship?: string;
  closeness?: number;
}