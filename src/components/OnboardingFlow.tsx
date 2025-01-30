import { useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { TypewriterText } from "@/components/TypewriterText";
import { PersonalityQuiz } from "@/components/PersonalityQuiz";
import { InterestSelector } from "@/components/InterestSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BasicInfo } from "./onboarding/BasicInfo";
import { GoalsSection } from "./onboarding/GoalsSection";
import { DemographicsSection } from "./onboarding/DemographicsSection";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateChatResponse } from "@/utils/openai";

interface OnboardingFlowProps {
  onComplete: () => void;
}

interface OnboardingState {
  name?: string;
  goals?: string[];
  personalityTraits?: Record<string, number>;
  personalityComments?: string[];
  currentInterests?: string[];
  desiredInterests?: string[];
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<'basic' | 'goals' | 'personality' | 'current-interests' | 'desired-interests' | 'demographics'>('basic');
  const [state, setState] = useState<OnboardingState>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [personalityResponse, setPersonalityResponse] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const handleBasicInfoComplete = (name: string) => {
    setState(prev => ({ ...prev, name }));
    setTimeout(() => {
      setStep('goals');
    }, 500);
  };

  const handleGoalsComplete = (goals: string[]) => {
    setState(prev => ({ ...prev, goals }));
    setTimeout(() => {
      setStep('personality');
    }, 500);
  };

  const handlePersonalityComplete = async (traits: Record<string, number>, comments: string[]) => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          personality_traits: traits,
          personality_comments: comments 
        })
        .eq('id', session?.user.id);

      setState(prev => ({ ...prev, personalityTraits: traits, personalityComments: comments }));
      
      setIsLoadingAi(true);
      const prompt = `Based on these personality quiz answers ${JSON.stringify(traits)} and comments ${JSON.stringify(comments)}, give a very brief (max 50 words) insight about this person's personality. Keep it friendly and positive.`;
      const response = await generateChatResponse(prompt);
      setPersonalityResponse(response);
      setIsLoadingAi(false);
      
      setStep('current-interests');
    } catch (error) {
      toast({
        title: "Error saving personality data",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCurrentInterestsComplete = async (interests: string[]) => {
    try {
      await supabase
        .from('profiles')
        .update({ current_interests: interests })
        .eq('id', session?.user.id);

      setState(prev => ({ ...prev, currentInterests: interests }));
      setStep('desired-interests');
    } catch (error) {
      toast({
        title: "Error saving interests",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDesiredInterestsComplete = async (interests: string[]) => {
    try {
      await supabase
        .from('profiles')
        .update({ desired_interests: interests })
        .eq('id', session?.user.id);

      setState(prev => ({ ...prev, desiredInterests: interests }));
      setStep('demographics');
    } catch (error) {
      toast({
        title: "Error saving interests",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDemographicsComplete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: 'complete'
        })
        .eq('id', session?.user.id);
      
      onComplete();
    } catch (error) {
      toast({
        title: "Error completing onboarding",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'goals':
        setStep('basic');
        break;
      case 'personality':
        setStep('goals');
        break;
      case 'current-interests':
        setStep('personality');
        break;
      case 'desired-interests':
        setStep('current-interests');
        break;
      case 'demographics':
        setStep('desired-interests');
        break;
    }
  };

  const showBackButton = step !== 'basic';

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
            onComplete={handleBasicInfoComplete}
            initialName={state.name}
          />
        )}

        {step === 'goals' && (
          <GoalsSection 
            session={session} 
            onComplete={handleGoalsComplete}
            initialGoals={state.goals}
          />
        )}

        {step === 'personality' && (
          <>
            <div className="text-lg">
              <TypewriterText
                text="Now, I'd like to understand your personality better. Let's do a quick quiz!"
                delay={0}
                onComplete={() => setShowQuiz(true)}
              />
            </div>
            <div className={cn(
              "transition-opacity duration-500",
              showQuiz ? "opacity-100" : "opacity-0"
            )}>
              <PersonalityQuiz 
                onComplete={handlePersonalityComplete}
                initialTraits={state.personalityTraits}
                initialComments={state.personalityComments}
              />
            </div>
          </>
        )}

        {step === 'current-interests' && (
          <>
            {isLoadingAi ? (
              <div className="text-sm text-gray-500 animate-pulse">
                Analyzing your personality...
              </div>
            ) : personalityResponse && (
              <div className="bg-primary/10 p-4 rounded-lg mb-6">
                <TypewriterText text={personalityResponse} />
              </div>
            )}
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
              onComplete={handleCurrentInterestsComplete}
              placeholder="Type to search activities..."
              minSelections={3}
              initialSelections={state.currentInterests}
            />
          </>
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
              onComplete={handleDesiredInterestsComplete}
              placeholder="Type to search new activities..."
              minSelections={1}
              initialSelections={state.desiredInterests}
            />
          </>
        )}

        {step === 'demographics' && (
          <DemographicsSection 
            session={session} 
            onComplete={handleDemographicsComplete} 
          />
        )}
      </div>
    </div>
  );
};