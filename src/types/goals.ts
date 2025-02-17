
export interface Goal {
  type: string;
  description: string;
  timeframe: string;
  completed: boolean;
  created_at: string;
  rank?: number;
  [key: string]: string | boolean | number | undefined;
}
