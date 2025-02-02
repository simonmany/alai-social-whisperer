import { useState, useEffect, useCallback } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BasicInfo } from "./onboarding/BasicInfo";
import { GoalsSection } from "./onboarding/GoalsSection";
import { DemographicsSection } from "./onboarding/DemographicsSection";
import { PersonalityIntro } from "./onboarding/personality/PersonalityIntro";
import { PersonalityQuestion } from "./onboarding/personality/PersonalityQuestion";
import { InterestSelector } from "@/components/InterestSelector";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SkipForward } from "lucide-react";
import { generateChatResponse } from "@/utils/openai";
import { cn } from "@/lib/utils";
import type { OnboardingState } from "@/types/onboarding";

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = 
  | 'basic' 
  | 'goals' 
  | 'personality-intro'
  | 'personality-q1'
  | 'personality-q2'
  | 'personality-q3'
  | 'personality-q4'
  | 'interests'
  | 'future-interests'
  | 'demographics';

const questions = [
  {
    id: 1,
    text: "Do you consider yourself an introvert or an extrovert?",
    leftLabel: "introvert",
    rightLabel: "extrovert",
  },
  {
    id: 2,
    text: "Are you typically quiet or talkative in social settings?",
    leftLabel: "Quality over quantity",
    rightLabel: "adept conversationalist",
  },
  {
    id: 3,
    text: "Do you prefer to hang out with people one on one or in groups?",
    leftLabel: "Love a duet",
    rightLabel: "love an orchestra",
  },
  {
    id: 4,
    text: "Do you prefer to plan ahead or be spontaneous?",
    leftLabel: "I live by my calendar",
    rightLabel: "What's a calendar?",
  },
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStep>('basic');
  const [state, setState] = useState<OnboardingState>({});
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const [aiPreferencesResponse, setAiPreferencesResponse] = useState<string>("");
  const [isLoadingPreferencesAi, setIsLoadingPreferencesAi] = useState(false);
  const [hasPlayedTypewriter, setHasPlayedTypewriter] = useState(false);
  const [hasPlayedFollowUp, setHasPlayedFollowUp] = useState(false);
  const followUpText = "Now, what are some **new** things you'd like to try?";
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [isAnalyzingInterests, setIsAnalyzingInterests] = useState(false);
  const [hasPlayedSkipMessage, setHasPlayedSkipMessage] = useState(false);
  const handleSkipMessageComplete = useCallback(() => {
    setHasPlayedSkipMessage(true);
  }, []);

  const handleBack = () => {
    switch (step) {
      case 'goals':
        setStep('basic');
        break;
      case 'personality-intro':
        setStep('goals');
        break;
      case 'personality-q1':
        setStep('personality-intro');
        break;
      case 'personality-q2':
        setStep('personality-q1');
        break;
      case 'personality-q3':
        setStep('personality-q2');
        break;
      case 'personality-q4':
        setStep('personality-q3');
        break;
      case 'interests':
        setStep('personality-q4');
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
      case 'personality-q1':
      case 'personality-q2':
      case 'personality-q3':
      case 'personality-q4':
        const nextSteps: Record<string, OnboardingStep> = {
          'personality-q1': 'personality-q2',
          'personality-q2': 'personality-q3',
          'personality-q3': 'personality-q4',
          'personality-q4': 'interests'
        };
        setStep(nextSteps[step]);
        break;
      case 'interests':
        setStep('future-interests');
        break;
      case 'future-interests':
        setStep('demographics');
        break;
    }
  };

  const handlePersonalityAnswer = async (questionIndex: number, value: number, comment: string) => {
    const updatedTraits = { ...state.personalityTraits, [questions[questionIndex].id]: value };
    const updatedComments = [...(state.personalityComments || [])];
    updatedComments[questionIndex] = comment;

    setState(prev => ({
      ...prev,
      personalityTraits: updatedTraits,
      personalityComments: updatedComments
    }));

    setIsLoadingAi(true);
    try {
      const question = questions[questionIndex];
      const responseType = value <= 40 ? question.leftLabel : value >= 80 ? question.rightLabel : "balanced";
      let prompt = `Hey, I'm learning about ${state.name}'s personality. For the question "${question.text}", they lean towards being ${responseType}`;
      
      if (comment.trim()) {
        prompt += `. Also, the user said this in relation to the question: "${comment}"`;
      }
      
      const previousComments = updatedComments.filter((_, index) => index < questionIndex);
      if (previousComments.length > 0) {
        prompt += `. In previous questions, they've mentioned: "${previousComments.join('", "')}"`;
      }
      
      prompt += `. Give a very brief (max 50 words) friendly insight about this aspect of their personality.`;

      console.log('Personality Quiz - Model Input:', {
        questionIndex,
        questionText: question.text,
        selectedValue: value,
        responseType,
        userComment: comment,
        previousComments,
        fullPrompt: prompt
      });
      
      const response = await generateChatResponse(prompt);
      setAiResponse(response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error getting AI response",
        description: "Please try again",
        variant: "destructive",
      });
    }
    setIsLoadingAi(false);

    const nextSteps: Record<number, OnboardingStep> = {
      0: 'personality-q2',
      1: 'personality-q3',
      2: 'personality-q4',
      3: 'interests'
    };
    setStep(nextSteps[questionIndex]);
  };

  const showBackButton = step !== 'basic';
  const showSkipButton = ['personality-q1', 'personality-q2', 'personality-q3', 'personality-q4', 'interests', 'future-interests'].includes(step);
  const currentQuestionIndex = step.startsWith('personality-q') 
    ? parseInt(step.charAt(step.length - 1)) - 1 
    : -1;

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

  const canProceedToNextSection = (section: 'current' | 'future') => {
    if (section === 'current') {
      return !!(state.currentInterests?.length || state.foodPreferences?.length || state.musicPreferences?.length);
    } else {
      return !!(state.desiredInterests?.length || state.desiredFoodPreferences?.length || state.desiredMusicPreferences?.length);
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

        console.log('Received response from analyze-preferences:', data);

        if (error) {
          console.error('Error from analyze-preferences:', error);
          throw error;
        }

        if (!data.response) {
          console.error('No response received from analyze-preferences');
          throw new Error('No response received from AI analysis');
        }

        console.log('Setting AI response:', data.response);
        setAiPreferencesResponse(data.response);
        
      } catch (error) {
        console.error('Error getting AI response:', error);
        toast({
          title: "Error getting AI response",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPreferencesAi(false);
        setIsAnalyzingInterests(false);
        setStep('future-interests');
      }
    }
  };

  const handleLine1Complete = useCallback(() => {
    setHasPlayedLine1(true);
  }, []);

  const handleLine2Complete = useCallback(() => {
    setHasPlayedLine2(true);
  }, []);

  const handleLine3Complete = useCallback(() => {
    setHasPlayedLine3(true);
  }, []);

  const handleTypewriterComplete = useCallback(() => {
    setHasPlayedTypewriter(true);
  }, []);

  const handleFollowUpComplete = useCallback(() => {
    setHasPlayedFollowUp(true);
  }, []);

  const capitalizeFirstLetter = (string: string = '') => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        {showBackButton && (
          <Button
            variant="ghost"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        {showSkipButton && (
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="ml-auto"
          >
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
              setState(prev => ({ ...prev, name: capitalizeFirstLetter(name) }));
              setStep('goals');
            }}
            initialName={state.name}
          />
        )}

        {step === 'goals' && (
          <GoalsSection 
            session={session} 
            onComplete={(goals) => {
              setState(prev => ({ ...prev, goals }));
              setStep('personality-intro');
            }}
            initialGoals={state.goals}
            userName={state.name}
          />
        )}

        {step === 'personality-intro' && (
          <PersonalityIntro
            userName={state.name}
            onStart={() => setStep('personality-q1')}
          />
        )}

        {currentQuestionIndex >= 0 && (
          <>
            <div className="h-1 w-full bg-gray-200 rounded">
              <div
                className="h-1 bg-primary rounded transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <PersonalityQuestion
              question={questions[currentQuestionIndex]}
              initialValue={state.personalityTraits?.[questions[currentQuestionIndex].id]}
              aiResponse={aiResponse}
              isLoadingAi={isLoadingAi}
              onAnswer={(value, comment) => handlePersonalityAnswer(currentQuestionIndex, value, comment)}
            />
          </>
        )}

        {step === 'interests' && (
          <div className="space-y-8">
            <div>
              <div className="text-lg space-y-6 mb-8">
                {hasPlayedLine1 ? (
                  <div>{`I'm looking forward to getting to know you even better over time, ${capitalizeFirstLetter(state.name)}.`}</div>
                ) : (
                  <TypewriterText
                    key="line1"
                    text={`I'm looking forward to getting to know you even better over time, ${capitalizeFirstLetter(state.name)}.`}
                    delay={0}
                    onComplete={handleLine1Complete}
                  />
                )}

                {hasPlayedLine1 && (
                  hasPlayedLine2 ? (
                    <div>Now, let's talk about what you like to do for fun, what you like to eat, and what you like to listen to.</div>
                  ) : (
                    <TypewriterText
                      key="line2"
                      text="Now, let's talk about what you like to do for fun, what you like to eat, and what you like to listen to."
                      delay={500}
                      onComplete={handleLine2Complete}
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
                      delay={500}
                      onComplete={handleLine3Complete}
                    />
                  )
                )}
              </div>
              <div className="space-y-8">
                <div>
                  <h3 className="text-base font-medium mb-4">Activities & Hobbies</h3>
                  <InterestSelector
                    type="activities"
                    onComplete={handleInterestComplete('activities')}
                    placeholder="Type to search activities..."
                    minSelections={1}
                    initialSelections={state.currentInterests}
                  />
                </div>
                <div>
                  <h3 className="text-base font-medium mb-4">Food Preferences</h3>
                  <InterestSelector
                    type="food"
                    onComplete={handleInterestComplete('food')}
                    placeholder="Type your favorite cuisines and dishes..."
                    minSelections={1}
                    initialSelections={state.foodPreferences}
                  />
                </div>
                <div>
                  <h3 className="text-base font-medium mb-4">Music Preferences</h3>
                  <InterestSelector
                    type="music"
                    onComplete={handleInterestComplete('music')}
                    placeholder="Type your favorite music genres..."
                    minSelections={1}
                    initialSelections={state.musicPreferences}
                  />
                </div>
                {canProceedToNextSection('current') && (
                  <Button 
                    onClick={handleProceedToFutureInterests}
                    className="w-full"
                    disabled={isAnalyzingInterests}
                  >
                    {isAnalyzingInterests ? "Analyzing your interests..." : "Next"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'future-interests' && (
          <div className="space-y-8">
            <div>
              {isLoadingPreferencesAi ? (
                <div className="text-lg mb-8">
                  <div className="animate-pulse">Thinking about your interests...</div>
                </div>
              ) : aiPreferencesResponse ? (
                <div className="space-y-4">
                  <div className="text-lg bg-primary/5 p-6 rounded-lg">
                    {hasPlayedTypewriter ? (
                      <div>{aiPreferencesResponse}</div>
                    ) : (
                      <TypewriterText
                        key="preferences"
                        text={aiPreferencesResponse}
                        delay={0}
                        onComplete={handleTypewriterComplete}
                      />
                    )}
                  </div>
                  <div className="text-lg">
                    {hasPlayedFollowUp ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: followUpText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                      }} />
                    ) : (
                      <TypewriterText
                        key="followup"
                        text={followUpText}
                        delay={500}
                        onComplete={handleFollowUpComplete}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-lg">
                    {hasPlayedSkipMessage ? (
                      <div>No worries - you can always tell me about your interests later</div>
                    ) : (
                      <TypewriterText
                        key="skip-message"
                        text="No worries - you can always tell me about your interests later"
                        delay={0}
                        onComplete={handleSkipMessageComplete}
                      />
                    )}
                  </div>
                  <div className="text-lg">
                    {hasPlayedFollowUp ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: followUpText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                      }} />
                    ) : (
                      <TypewriterText
                        key="followup"
                        text={followUpText}
                        delay={500}
                        onComplete={handleFollowUpComplete}
                      />
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-base font-medium mb-4">Activities & Hobbies</h3>
                <InterestSelector
                  type="activities"
                  onComplete={handleFutureInterestComplete('activities')}
                  placeholder="Type activities you'd like to try..."
                  minSelections={1}
                  initialSelections={state.desiredInterests}
                />
              </div>
              <div>
                <h3 className="text-base font-medium mb-4">Food Preferences</h3>
                <InterestSelector
                  type="food"
                  onComplete={handleFutureInterestComplete('food')}
                  placeholder="Type cuisines you'd like to try..."
                  minSelections={1}
                  initialSelections={state.desiredFoodPreferences}
                />
              </div>
              <div>
                <h3 className="text-base font-medium mb-4">Music Preferences</h3>
                <InterestSelector
                  type="music"
                  onComplete={handleFutureInterestComplete('music')}
                  placeholder="Type music genres you'd like to explore..."
                  minSelections={1}
                  initialSelections={state.desiredMusicPreferences}
                />
              </div>
              {canProceedToNextSection('future') && (
                <Button 
                  onClick={() => setStep('demographics')}
                  className="w-full"
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
