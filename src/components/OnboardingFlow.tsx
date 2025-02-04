import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BasicInfo } from "./onboarding/BasicInfo";
import { GoalsSection } from "./onboarding/GoalsSection";
import { DemographicsSection } from "./onboarding/DemographicsSection";
import { PersonalityIntro } from "./onboarding/personality/PersonalityIntro";
import { PersonalityQuestion } from "./onboarding/personality/PersonalityQuestion";
import { InterestsSection } from "./onboarding/interests/InterestsSection";
import { FutureInterestsSection } from "./onboarding/interests/FutureInterestsSection";
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

  const handleSkip = () => {
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

      const aiResponse = await generateChatResponse(prompt);
      setAiResponse(aiResponse.response);
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
              setState(prev => ({ ...prev, name }));
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
          <InterestsSection
            state={state}
            onStateChange={(newState) => setState(prev => ({ ...prev, ...newState }))}
            onComplete={() => setStep('future-interests')}
            session={session}
          />
        )}

        {step === 'future-interests' && (
          <FutureInterestsSection
            state={state}
            onStateChange={(newState) => setState(prev => ({ ...prev, ...newState }))}
            onComplete={() => setStep('demographics')}
            aiPreferencesResponse={aiPreferencesResponse}
            isLoadingPreferencesAi={isLoadingPreferencesAi}
          />
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