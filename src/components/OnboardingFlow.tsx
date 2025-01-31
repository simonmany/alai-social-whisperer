import { useState } from "react";
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
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateChatResponse } from "@/utils/openai";

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
  | 'current-interests'
  | 'desired-interests'
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

interface OnboardingState {
  name?: string;
  goals?: string[];
  personalityTraits?: Record<string, number>;
  personalityComments?: string[];
  currentInterests?: string[];
  desiredInterests?: string[];
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStep>('basic');
  const [state, setState] = useState<OnboardingState>({});
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

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
      case 'current-interests':
        setStep('personality-q4');
        break;
      case 'desired-interests':
        setStep('current-interests');
        break;
      case 'demographics':
        setStep('desired-interests');
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
      3: 'current-interests'
    };
    setStep(nextSteps[questionIndex]);
  };

  const showBackButton = step !== 'basic';
  const currentQuestionIndex = step.startsWith('personality-q') 
    ? parseInt(step.charAt(step.length - 1)) - 1 
    : -1;

  return (
    <div className="flex flex-col h-full">
      {showBackButton && (
        <Button
          variant="ghost"
          className="self-start mb-4"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
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

        {step === 'current-interests' && (
          <div className="space-y-4">
            <div className="text-lg">
              <TypewriterText
                text="Thanks for sharing! Now, let's talk about interests. What do you like to do for fun?"
                delay={0}
              />
            </div>
            <div className="text-lg">
              <TypewriterText
                text="Enter at least 3 activities."
                delay={1000}
              />
            </div>
            <InterestSelector
              onComplete={(interests) => {
                setState(prev => ({ ...prev, currentInterests: interests }));
                setStep('desired-interests');
              }}
              placeholder="Type to search activities..."
              minSelections={3}
              initialSelections={state.currentInterests}
            />
          </div>
        )}

        {step === 'desired-interests' && (
          <>
            <div className="text-lg">
              <TypewriterText
                text="That's a cool set of hobbies! Now, what is something you'd like to get into that you haven't done yet?"
                delay={0}
              />
            </div>
            <InterestSelector
              onComplete={(interests) => {
                setState(prev => ({ ...prev, desiredInterests: interests }));
                setStep('demographics');
              }}
              placeholder="Type to search new activities..."
              minSelections={1}
              initialSelections={state.desiredInterests}
            />
          </>
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
