export interface OnboardingState {
  name?: string;
  goals?: string[];
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
  contacts?: Array<{
    name: string;
    relationship?: string;
    // Add other contact properties as needed
  }>;
}