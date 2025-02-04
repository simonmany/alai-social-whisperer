import { useState, useEffect } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { InterestSelector } from "@/components/InterestSelector";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { OnboardingState } from "@/types/onboarding";

interface InterestsSectionProps {
  state: OnboardingState;
  onStateChange: (newState: Partial<OnboardingState>) => void;
  onComplete: () => void;
  session: any;
}

export const InterestsSection = ({ state, onStateChange, onComplete, session }: InterestsSectionProps) => {
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [isAnalyzingInterests, setIsAnalyzingInterests] = useState(false);
  const { toast } = useToast();

  const handleInterestComplete = (category: 'activities' | 'food' | 'music') => (selections: string[]) => {
    onStateChange({
      ...(category === 'activities' && { currentInterests: selections }),
      ...(category === 'food' && { foodPreferences: selections }),
      ...(category === 'music' && { musicPreferences: selections })
    });
  };

  const canProceedToNextSection = () => {
    return !!(state.currentInterests?.length || state.foodPreferences?.length || state.musicPreferences?.length);
  };

  const handleProceedToNextSection = async () => {
    if (canProceedToNextSection()) {
      setIsAnalyzingInterests(true);
      try {
        const { data, error } = await supabase.functions.invoke('analyze-preferences', {
          body: {
            activities: state.currentInterests || [],
            food: state.foodPreferences || [],
            music: state.musicPreferences || [],
            userId: session?.user.id
          }
        });

        if (error) throw error;
        if (!data.response) throw new Error('No response received from AI analysis');
        
        onComplete();
      } catch (error: any) {
        console.error('Error getting AI response:', error);
        toast({
          title: "Error analyzing interests",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzingInterests(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-lg space-y-6 mb-8">
          {hasPlayedLine1 ? (
            <div>{`I'm looking forward to getting to know you even better over time, ${state.name}.`}</div>
          ) : (
            <TypewriterText
              key="line1"
              text={`I'm looking forward to getting to know you even better over time, ${state.name}.`}
              delay={250}
              typingSpeed={25}
              onComplete={() => setHasPlayedLine1(true)}
            />
          )}

          {hasPlayedLine1 && (
            hasPlayedLine2 ? (
              <div>Now, let's talk about what you like to do for fun, what you like to eat, and what you like to listen to.</div>
            ) : (
              <TypewriterText
                key="line2"
                text="Now, let's talk about what you like to do for fun, what you like to eat, and what you like to listen to."
                delay={250}
                typingSpeed={25}
                onComplete={() => setHasPlayedLine2(true)}
              />
            )
          )}

          {hasPlayedLine2 && (
            hasPlayedLine3 ? (
              <div>This'll help me recommend things you love.</div>
            ) : (
              <TypewriterText
                key="line3"
                text="This'll help me recommend things you love."
                delay={250}
                typingSpeed={25}
                onComplete={() => {
                  setHasPlayedLine3(true);
                  setShowActivities(true);
                  setTimeout(() => setShowFood(true), 500);
                  setTimeout(() => setShowMusic(true), 1000);
                }}
              />
            )
          )}
        </div>

        <div className="transition-opacity duration-500" style={{ opacity: showActivities ? 1 : 0 }}>
          <h3 className="text-base font-medium mb-4">Activities & Hobbies</h3>
          <InterestSelector
            type="activities"
            onComplete={handleInterestComplete('activities')}
            placeholder="Type to search activities..."
            minSelections={1}
            initialSelections={state.currentInterests}
          />
        </div>

        <div className="transition-opacity duration-500 mt-8" style={{ opacity: showFood ? 1 : 0 }}>
          <h3 className="text-base font-medium mb-4">Food Preferences</h3>
          <InterestSelector
            type="food"
            onComplete={handleInterestComplete('food')}
            placeholder="Type your favorite cuisines and dishes..."
            minSelections={1}
            initialSelections={state.foodPreferences}
          />
        </div>

        <div className="transition-opacity duration-500 mt-8" style={{ opacity: showMusic ? 1 : 0 }}>
          <h3 className="text-base font-medium mb-4">Music Preferences</h3>
          <InterestSelector
            type="music"
            onComplete={handleInterestComplete('music')}
            placeholder="Type your favorite music genres..."
            minSelections={1}
            initialSelections={state.musicPreferences}
          />
        </div>

        {canProceedToNextSection() && (
          <Button 
            onClick={handleProceedToNextSection}
            className="w-full mt-8"
            disabled={isAnalyzingInterests}
          >
            {isAnalyzingInterests ? "Analyzing your interests..." : "Next"}
          </Button>
        )}
      </div>
    </div>
  );
};