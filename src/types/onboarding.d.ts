import { Goal } from "./goals";

export interface OnboardingState {
  name?: string;
  goals?: Goal[];
  personalityTraits?: Record<string, number>;
  personalityComments?: string[];
  currentInterests?: string[];
  desiredInterests?: string[];
  foodPreferences?: string[];
  musicPreferences?: string[];
  desiredFoodPreferences?: string[];
  desiredMusicPreferences?: string[];
}

export interface AIPreferencesResponse {
  response: string;
  contacts?: any[];
}