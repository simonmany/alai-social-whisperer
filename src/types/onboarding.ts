export interface OnboardingState {
  name?: string;
  goals?: string[];
  personalityTraits?: Record<string, number>;
  personalityComments?: string[];
  currentInterests?: string[];
  desiredInterests?: string[];
  foodPreferences?: string[];
  musicPreferences?: string[];
}