import { useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
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

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<'basic' | 'goals' | 'personality' | 'current-interests' | 'desired-interests' | 'demographics'>('basic');
  const { session } = useAuth();
  const { toast } = useToast();

  const handleBasicInfoComplete = (name: string) => {
    setTimeout(() => {
      setStep('goals');
    }, 500);
  };

  const handleGoalsComplete = () => {
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

      setStep('demographics');
    } catch (error) {
      toast({
        title: "Error saving interests",
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
          <BasicInfo session={session} onComplete={handleBasicInfoComplete} />
        )}

        {step === 'goals' && (
          <GoalsSection session={session} onComplete={handleGoalsComplete} />
        )}

        {step === 'personality' && (
          <>
            <ChatMessage
              content="Now, I'd like to understand your personality better. Let's do a quick quiz!"
              isAl={true}
              animate={true}
            />
            <PersonalityQuiz onComplete={handlePersonalityComplete} />
          </>
        )}

        {step === 'current-interests' && (
          <>
            <ChatMessage
              content="Thanks for sharing! Now, let's talk about interests. What do you like to do for fun?"
              isAl={true}
              animate={true}
            />
            <ChatMessage
              content="Enter at least 3 activities."
              isAl={true}
              animate={true}
            />
            <InterestSelector
              onComplete={handleCurrentInterestsComplete}
              placeholder="Type to search activities..."
              minSelections={3}
            />
          </>
        )}

        {step === 'desired-interests' && (
          <>
            <ChatMessage
              content="That's a cool set of hobbies! Now, what is something you'd like to get into that you haven't done yet?"
              isAl={true}
              animate={true}
            />
            <InterestSelector
              onComplete={handleDesiredInterestsComplete}
              placeholder="Type to search new activities..."
              minSelections={1}
            />
          </>
        )}

        {step === 'demographics' && (
          <DemographicsSection session={session} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
};