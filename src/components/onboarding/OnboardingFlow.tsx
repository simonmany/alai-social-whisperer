import { useState } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BasicInfo } from "@/components/onboarding/BasicInfo";
import { DemographicsSection } from "@/components/onboarding/DemographicsSection";
import { InterestSelector } from "@/components/InterestSelector";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingState, AIPreferencesResponse } from "@/types/onboarding";

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = 
  | 'basic' 
  | 'contacts'
  | 'interests'
  | 'future-interests'
  | 'demographics';

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStep>('basic');
  const [state, setState] = useState<OnboardingState>({});
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const [aiPreferencesResponse, setAiPreferencesResponse] = useState<string | AIPreferencesResponse>("");
  const [isLoadingPreferencesAi, setIsLoadingPreferencesAi] = useState(false);
  const [hasPlayedTypewriter, setHasPlayedTypewriter] = useState(false);
  const [hasPlayedFollowUp, setHasPlayedFollowUp] = useState(false);
  const followUpText = "Now, what are some **new** things you'd like to try?";
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [hasPlayedLine4, setHasPlayedLine4] = useState(false);
  const [hasPlayedLine5, setHasPlayedLine5] = useState(false);
  const [isAnalyzingInterests, setIsAnalyzingInterests] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showFutureActivities, setShowFutureActivities] = useState(false);
  const [showFutureFood, setShowFutureFood] = useState(false);
  const [showFutureMusic, setShowFutureMusic] = useState(false);

  const handleBack = () => {
    switch (step) {
      case 'contacts':
        setStep('basic');
        break;
      case 'interests':
        setStep('contacts');
        break;
      case 'future-interests':
        setStep('interests');
        break;
      case 'demographics':
        setStep('future-interests');
        break;
    }
  };

  const handleSkip = async () => {
    switch (step) {
      case 'interests':
        setStep('future-interests');
        break;
      case 'future-interests':
        setStep('demographics');
        break;
    }
  };

  const handleProceedToFutureInterests = async () => {
    if (canProceedToNextSection('current')) {
      setIsAnalyzingInterests(true);
      setIsLoadingPreferencesAi(true);
      console.log('Starting AI analysis of preferences:', {
        activities: state.currentInterests,
        food: state.foodPreferences,
        music: state.musicPreferences
      });

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
        if (!data.response) {
          throw new Error('No response received from AI analysis');
        }

        setAiPreferencesResponse(data.response);
        
      } catch (error: any) {
        console.error('Error getting AI response:', error);
        toast({
          title: "Error getting AI response",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPreferencesAi(false);
        setIsAnalyzingInterests(false);
        setStep('future-interests');
      }
    }
  };

  const canProceedToNextSection = (section: 'current' | 'future') => {
    if (section === 'current') {
      return !!(state.currentInterests?.length || state.foodPreferences?.length || state.musicPreferences?.length);
    } else {
      return !!(state.desiredInterests?.length || state.desiredFoodPreferences?.length || state.desiredMusicPreferences?.length);
    }
  };

  const showBackButton = step !== 'basic';
  const showSkipButton = ['interests', 'future-interests'].includes(step);

  const capitalizeFirstLetter = (str: string = "") => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleInterestComplete = (category: 'activities' | 'food' | 'music') => (selections: string[]) => {
    setState(prev => {
      const newState = { ...prev };
      switch (category) {
        case 'activities':
          newState.currentInterests = selections;
          break;
        case 'food':
          newState.foodPreferences = selections;
          break;
        case 'music':
          newState.musicPreferences = selections;
          break;
      }
      return newState;
    });
  };

  const handleFutureInterestComplete = (category: 'activities' | 'food' | 'music') => (selections: string[]) => {
    setState(prev => {
      const newState = { ...prev };
      switch (category) {
        case 'activities':
          newState.desiredInterests = selections;
          break;
        case 'food':
          newState.desiredFoodPreferences = selections;
          break;
        case 'music':
          newState.desiredMusicPreferences = selections;
          break;
      }
      return newState;
    });
  };

  const handleFollowUpComplete = () => {
    setHasPlayedFollowUp(true);
    setShowFutureActivities(true);
    setTimeout(() => setShowFutureFood(true), 500);
    setTimeout(() => setShowFutureMusic(true), 1000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        {showBackButton && (
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        {showSkipButton && (
          <Button variant="ghost" onClick={handleSkip} className="ml-auto">
            Skip
            <SkipForward className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden space-y-4 mb-4">
        {step === 'basic' && (
          <BasicInfo 
            session={session} 
            onComplete={(name) => {
              setState(prev => ({ ...prev, name }));
              setStep('contacts');
            }}
            initialName={state.name}
          />
        )}

        {step === 'contacts' && (
          <div className="space-y-8">
            {hasPlayedLine1 ? (
              <div className="text-lg">{`Nice to meet you, ${capitalizeFirstLetter(state.name)}.`}</div>
            ) : (
              <TypewriterText
                key="line1"
                text={`Nice to meet you, ${capitalizeFirstLetter(state.name)}.`}
                delay={250}
                typingSpeed={25}
                onComplete={() => setHasPlayedLine1(true)}
              />
            )}

            {hasPlayedLine1 && (
              hasPlayedLine2 ? (
                <div className="text-lg">Let's get to know each other.</div>
              ) : (
                <TypewriterText
                  key="line2"
                  text="Let's get to know each other."
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => setHasPlayedLine2(true)}
                />
              )
            )}

            {hasPlayedLine2 && (
              hasPlayedLine3 ? (
                <div className="text-lg">
                  My goal is to help you be intentional about your relationships. That includes:
                  <ul className="list-none space-y-2 mt-4 ml-4">
                    <li>- best friends</li>
                    <li>- new friends</li>
                    <li>- old friends</li>
                    <li>- family</li>
                    <li>- lovers</li>
                    <li>- work connections</li>
                    <li>- and people you haven't even met yet.</li>
                  </ul>
                </div>
              ) : (
                <TypewriterText
                  key="line3"
                  text={`My goal is to help you be intentional about your relationships. That includes:\n- best friends\n- new friends\n- old friends\n- family\n- lovers\n- work connections\n- and people you haven't even met yet.`}
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => setHasPlayedLine3(true)}
                />
              )
            )}

            {hasPlayedLine3 && (
              hasPlayedLine4 ? (
                <div className="text-lg">It's a lot to process - that's why I'm here.</div>
              ) : (
                <TypewriterText
                  key="line4"
                  text="It's a lot to process - that's why I'm here."
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => setHasPlayedLine4(true)}
                />
              )
            )}

            {hasPlayedLine4 && (
              hasPlayedLine5 ? (
                <div className="text-lg">Connect your contacts to get started - I'll never share your info with anyone else.</div>
              ) : (
                <TypewriterText
                  key="line5"
                  text="Connect your contacts to get started - I'll never share your info with anyone else."
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => setHasPlayedLine5(true)}
                />
              )
            )}

            {hasPlayedLine5 && (
              <div className="flex flex-col space-y-4 mt-8">
                <Button 
                  onClick={() => setStep('interests')}
                  className="w-full"
                >
                  Connect Contacts
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setStep('interests')}
                  className="w-full"
                >
                  Not Now
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'interests' && (
          <div className="space-y-8">
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
                  onComplete={() => {
                    setHasPlayedLine2(true);
                    setShowActivities(true);
                    setTimeout(() => setShowFood(true), 500);
                    setTimeout(() => setShowMusic(true), 1000);
                  }}
                />
              )
            )}

            <div className={cn(
              "space-y-8 mt-8",
              showActivities ? "opacity-100" : "opacity-0",
              "transition-opacity duration-500"
            )}>
              <div>
                <h3 className="text-base font-medium mb-4">Activities & Hobbies</h3>
                <InterestSelector
                  type="activities"
                  onComplete={handleInterestComplete('activities')}
                  placeholder="Type to search activities..."
                  minSelections={1}
                  value={state.currentInterests}
                  onChange={(selections) => {
                    setState(prev => ({ ...prev, currentInterests: selections }));
                  }}
                />
              </div>
            </div>

            <div className={cn(
              "space-y-8 mt-8",
              showFood ? "opacity-100" : "opacity-0",
              "transition-opacity duration-500"
            )}>
              <div>
                <h3 className="text-base font-medium mb-4">Food Preferences</h3>
                <InterestSelector
                  type="food"
                  onComplete={handleInterestComplete('food')}
                  placeholder="Type your favorite cuisines and dishes..."
                  minSelections={1}
                  value={state.foodPreferences}
                  onChange={(selections) => {
                    setState(prev => ({ ...prev, foodPreferences: selections }));
                  }}
                />
              </div>
            </div>

            <div className={cn(
              "space-y-8 mt-8",
              showMusic ? "opacity-100" : "opacity-0",
              "transition-opacity duration-500"
            )}>
              <div>
                <h3 className="text-base font-medium mb-4">Music Preferences</h3>
                <InterestSelector
                  type="music"
                  onComplete={handleInterestComplete('music')}
                  placeholder="Type your favorite music genres..."
                  minSelections={1}
                  value={state.musicPreferences}
                  onChange={(selections) => {
                    setState(prev => ({ ...prev, musicPreferences: selections }));
                  }}
                />
              </div>
            </div>

            {canProceedToNextSection('current') && (
              <Button 
                onClick={handleProceedToFutureInterests}
                className="w-full mt-8"
                disabled={isAnalyzingInterests}
              >
                {isAnalyzingInterests ? "Analyzing your interests..." : "Next"}
              </Button>
            )}
          </div>
        )}

        {step === 'future-interests' && (
          <div className="space-y-8">
            <div className="space-y-8">
              {isLoadingPreferencesAi ? (
                <div className="text-lg animate-pulse">
                  Thinking about your interests...
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
                      <div dangerouslySetInnerHTML={{ 
                        __html: followUpText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                      }} />
                    ) : (
                      <TypewriterText
                        key="followup"
                        text={followUpText}
                        delay={250}
                        typingSpeed={25}
                        onComplete={handleFollowUpComplete}
                      />
                    )}
                  </div>
                </div>
              ) : null}

              <div>
                <div className={cn(
                  "transition-opacity duration-500",
                  showFutureActivities ? "opacity-100" : "opacity-0"
                )}>
                  <h3 className="text-base font-medium mb-4">Activities & Hobbies</h3>
                  <InterestSelector
                    type="activities"
                    onComplete={handleFutureInterestComplete('activities')}
                    placeholder="Type activities you'd like to try..."
                    minSelections={1}
                    value={state.desiredInterests}
                    onChange={(selections) => {
                      setState(prev => ({ ...prev, desiredInterests: selections }));
                    }}
                  />
                </div>

                <div className={cn(
                  "transition-opacity duration-500 mt-8",
                  showFutureFood ? "opacity-100" : "opacity-0"
                )}>
                  <h3 className="text-base font-medium mb-4">Food Preferences</h3>
                  <InterestSelector
                    type="food"
                    onComplete={handleFutureInterestComplete('food')}
                    placeholder="Type cuisines you'd like to try..."
                    minSelections={1}
                    value={state.desiredFoodPreferences}
                    onChange={(selections) => {
                      setState(prev => ({ ...prev, desiredFoodPreferences: selections }));
                    }}
                  />
                </div>

                <div className={cn(
                  "transition-opacity duration-500 mt-8",
                  showFutureMusic ? "opacity-100" : "opacity-0"
                )}>
                  <h3 className="text-base font-medium mb-4">Music Preferences</h3>
                  <InterestSelector
                    type="music"
                    onComplete={handleFutureInterestComplete('music')}
                    placeholder="Type music genres you'd like to explore..."
                    minSelections={1}
                    value={state.desiredMusicPreferences}
                    onChange={(selections) => {
                      setState(prev => ({ ...prev, desiredMusicPreferences: selections }));
                    }}
                  />
                </div>
              </div>

              {canProceedToNextSection('future') && (
                <Button 
                  onClick={() => setStep('demographics')}
                  className="w-full mt-8"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'demographics' && (
          <DemographicsSection 
            session={session} 
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
};
