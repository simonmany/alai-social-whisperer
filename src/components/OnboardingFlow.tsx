import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Contact } from "@/types";
import { CalendarIcon, CheckCircle2, GraduationCap, HeartHandshake, LucideIcon, MessageSquare, User2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PersonalityIntro } from "./onboarding/personality/PersonalityIntro";
import { PersonalityQuiz } from "./onboarding/personality/PersonalityQuiz";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Interests } from "./onboarding/Interests";
import { Goals } from "./onboarding/Goals";
import { ProfileDetails } from "./onboarding/ProfileDetails";

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep =
  | 'initial'
  | 'splash'
  | 'personalityIntro'
  | 'personalityQuiz'
  | 'interests'
  | 'goals'
  | 'profileDetails'
  | 'complete';

const stepIcons: Record<OnboardingStep, LucideIcon> = {
  'initial': User2,
  'splash': HeartHandshake,
  'personalityIntro': MessageSquare,
  'personalityQuiz': MessageSquare,
  'interests': CalendarIcon,
  'goals': GraduationCap,
  'profileDetails': User2,
  'complete': CheckCircle2,
};

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [personalityTraits, setPersonalityTraits] = useState<Record<string, number>>({});
  const [personalityComments, setPersonalityComments] = useState<string[]>([]);
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadOnboardingState = async () => {
      if (!session?.user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_step, personality_traits, personality_comments')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          setStep(data.onboarding_step as OnboardingStep || 'splash');
          if (data.personality_traits) setPersonalityTraits(data.personality_traits);
          if (data.personality_comments) setPersonalityComments(data.personality_comments);
        }
      } catch (error) {
        console.error('Error loading onboarding state:', error);
      }
    };

    loadOnboardingState();
  }, [session?.user?.id]);

  const handleStepChange = async (newStep: OnboardingStep) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: newStep })
        .eq('id', session.user.id);

      if (error) throw error;

      setStep(newStep);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: any) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', session.user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 'splash':
        return (
          <div className="space-y-8 text-center">
            <h1 className="text-4xl md:text-5xl font-semibold">
              Welcome to Alai - your social intelligence
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground">
              Let's get to know each other better
            </p>
            <Button 
              onClick={() => handleStepChange('initial')}
              className="w-full text-xl py-6"
            >
              Get Started
            </Button>
          </div>
        );
      case 'initial':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold">
              Hi! I'm Al, your social life assistant.
            </h2>
            <p className="text-muted-foreground">
              I'm here to help you make the most of your social life.
            </p>
            <Button onClick={() => handleStepChange('personalityIntro')} className="w-full text-xl py-6">
              Continue
            </Button>
          </div>
        );
      case 'personalityIntro':
        return (
          <PersonalityIntro
            onStart={() => handleStepChange('personalityQuiz')}
          />
        );
      case 'personalityQuiz':
        return (
          <PersonalityQuiz
            onComplete={async (traits, comments) => {
              await updateProfile({
                personality_traits: traits,
                personality_comments: comments,
              });
              handleStepChange('interests');
            }}
          />
        );
      case 'interests':
        return (
          <Interests
            onComplete={async (currentInterests, desiredInterests) => {
              await updateProfile({
                current_interests: currentInterests,
                desired_interests: desiredInterests,
              });
              handleStepChange('goals');
            }}
          />
        );
      case 'goals':
        return (
          <Goals
            onComplete={async (goals) => {
              await updateProfile({ goals });
              handleStepChange('profileDetails');
            }}
          />
        );
      case 'profileDetails':
        return (
          <ProfileDetails
            onComplete={async () => {
              await updateProfile({ onboarding_completed: true, onboarding_step: 'complete' });
              onComplete();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
};
