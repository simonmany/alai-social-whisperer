export interface Goal {
  type: string;
  description: string;
  timeframe: string;
  completed: boolean;
  created_at: string;
  [key: string]: string | boolean;
}