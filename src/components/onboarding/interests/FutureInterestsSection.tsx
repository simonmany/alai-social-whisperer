import { useState } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { InterestSelector } from "@/components/InterestSelector";
import { Button } from "@/components/ui/button";
import type { OnboardingState, AIPreferencesResponse } from "@/types/onboarding";

interface FutureInterestsSectionProps {
  state: OnboardingState;
  onStateChange: (newState: Partial<OnboardingState>) => void;
  onComplete: () => void;
  aiPreferencesResponse: string | AIPreferencesResponse;
  isLoadingPreferencesAi: boolean;
}

export const FutureInterestsSection = ({ 
  state, 
  onStateChange, 
  onComplete,
  aiPreferencesResponse,
  isLoadingPreferencesAi
}: FutureInterestsSectionProps) => {
  const [hasPlayedTypewriter, setHasPlayedTypewriter] = useState(false);
  const [hasPlayedFollowUp, setHasPlayedFollowUp] = useState(false);
  const [showFutureActivities, setShowFutureActivities] = useState(false);
  const [showFutureFood, setShowFutureFood] = useState(false);
  const [showFutureMusic, setShowFutureMusic] = useState(false);

  const handleFutureInterestComplete = (category: 'activities' | 'food' | 'music') => (selections: string[]) => {
    onStateChange({
      ...(category === 'activities' && { desiredInterests: selections }),
      ...(category === 'food' && { desiredFoodPreferences: selections }),
      ...(category === 'music' && { desiredMusicPreferences: selections })
    });
  };

  const canProceedToNextSection = () => {
    return !!(state.desiredInterests?.length || state.desiredFoodPreferences?.length || state.desiredMusicPreferences?.length);
  };

  const handleFollowUpComplete = () => {
    setHasPlayedFollowUp(true);
    setShowFutureActivities(true);
    setTimeout(() => setShowFutureFood(true), 500);
    setTimeout(() => setShowFutureMusic(true), 1000);
  };

  return (
    <div className="space-y-8">
      <div>
        {isLoadingPreferencesAi ? (
          <div className="text-lg mb-8">
            <div className="animate-pulse">Thinking about your interests...</div>
          </div>
        ) : aiPreferencesResponse ? (
          <div className="space-y-8">
            <div className="text-lg bg-primary/5 p-6 rounded-lg">
              {hasPlayedTypewriter ? (
                <div>
                  {typeof aiPreferencesResponse === 'string' 
                    ? aiPreferencesResponse 
                    : aiPreferencesResponse.response}
                </div>
              ) : (
                <TypewriterText
                  key="preferences"
                  text={typeof aiPreferencesResponse === 'string' 
                    ? aiPreferencesResponse 
                    : aiPreferencesResponse.response}
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => setHasPlayedTypewriter(true)}
                />
              )}
            </div>
            <div className="text-lg mb-16">
              {hasPlayedFollowUp ? (
                <div>Now, what are some <strong>new</strong> things you'd like to try?</div>
              ) : (
                <TypewriterText
                  key="followup"
                  text="Now, what are some **new** things you'd like to try?"
                  delay={250}
                  typingSpeed={25}
                  onComplete={handleFollowUpComplete}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-lg">
              <div>No worries - you can always tell me about your interests later.</div>
            </div>
            <div className="text-lg mb-16">
              {hasPlayedFollowUp ? (
                <div>Now, what are some <strong>new</strong> things you'd like to try?</div>
              ) : (
                <TypewriterText
                  key="followup"
                  text="Now, what are some **new** things you'd like to try?"
                  delay={250}
                  typingSpeed={25}
                  onComplete={handleFollowUpComplete}
                />
              )}
            </div>
          </div>
        )}

        <div>
          <div className="transition-opacity duration-500" style={{ opacity: showFutureActivities ? 1 : 0 }}>
            <h3 className="text-base font-medium mb-4">Activities & Hobbies</h3>
            <InterestSelector
              type="activities"
              onComplete={handleFutureInterestComplete('activities')}
              placeholder="Type activities you'd like to try..."
              minSelections={1}
              initialSelections={state.desiredInterests}
            />
          </div>

          <div className="transition-opacity duration-500 mt-8" style={{ opacity: showFutureFood ? 1 : 0 }}>
            <h3 className="text-base font-medium mb-4">Food Preferences</h3>
            <InterestSelector
              type="food"
              onComplete={handleFutureInterestComplete('food')}
              placeholder="Type cuisines you'd like to try..."
              minSelections={1}
              initialSelections={state.desiredFoodPreferences}
            />
          </div>

          <div className="transition-opacity duration-500 mt-8" style={{ opacity: showFutureMusic ? 1 : 0 }}>
            <h3 className="text-base font-medium mb-4">Music Preferences</h3>
            <InterestSelector
              type="music"
              onComplete={handleFutureInterestComplete('music')}
              placeholder="Type music genres you'd like to explore..."
              minSelections={1}
              initialSelections={state.desiredMusicPreferences}
            />
          </div>
        </div>

        {canProceedToNextSection() && (
          <Button 
            onClick={onComplete}
            className="w-full mt-8"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};