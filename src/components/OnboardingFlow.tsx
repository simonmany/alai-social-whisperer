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
import { Button } from "./ui/button";
import { UserRound, Calendar } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
  onProfileOpen: () => void;
  onGoogleSignIn: () => void;
}

export const OnboardingFlow = ({ onComplete, onProfileOpen, onGoogleSignIn }: OnboardingFlowProps) => {
  const [step, setStep] = useState<
    'basic' | 
    'profile-highlight' | 
    'calendar-highlight' | 
    'goals' | 
    'personality' | 
    'current-interests' | 
    'desired-interests' | 
    'demographics'
  >('basic');
  const { session } = useAuth();
  const { toast } = useToast();

  const handleBasicInfoComplete = (name: string) => {
    setTimeout(() => {
      setStep('profile-highlight');
    }, 500);
  };

  const handleProfileHighlightComplete = () => {
    setTimeout(() => {
      setStep('calendar-highlight');
    }, 500);
  };

  const handleCalendarHighlightComplete = () => {
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {step === 'basic' && (
          <BasicInfo session={session} onComplete={handleBasicInfoComplete} />
        )}

        {step === 'profile-highlight' && (
          <>
            <ChatMessage
              content="Thanks for introducing yourself! I've created a profile for you here."
              isAl={true}
              animate={true}
            />
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="lg"
                className="animate-pulse border-2 border-primary"
                onClick={() => {
                  onProfileOpen();
                  handleProfileHighlightComplete();
                }}
              >
                <UserRound className="h-5 w-5 mr-2" />
                View Your Profile
              </Button>
            </div>
          </>
        )}

        {step === 'calendar-highlight' && (
          <>
            <ChatMessage
              content="Connecting your calendar(s) helps me plan fun things for you. I'll never use it for anything else."
              isAl={true}
              animate={true}
            />
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="lg"
                className="animate-pulse border-2 border-primary flex items-center gap-2"
                onClick={() => {
                  onGoogleSignIn();
                  handleCalendarHighlightComplete();
                }}
              >
                <Calendar className="h-5 w-5" />
                <img 
                  src="https://www.google.com/favicon.ico" 
                  alt="Google" 
                  className="w-4 h-4"
                />
                Connect Calendar
              </Button>
            </div>
          </>
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