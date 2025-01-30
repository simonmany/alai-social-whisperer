import { useEffect, useState } from "react";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'initial' | 'profile' | 'goals' | 'complete'>('initial');
  const { session } = useAuth();

  useEffect(() => {
    const updateTutorialStep = async () => {
      if (!session?.user.id) return;
      
      await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('id', session.user.id);

      if (step === 'complete') {
        await supabase
          .from('profiles')
          .update({ has_completed_tutorial: true })
          .eq('id', session.user.id);
        onComplete();
      }
    };

    updateTutorialStep();
  }, [step, session?.user.id]);

  // Progress to next step when profile is opened
  useEffect(() => {
    if (isProfileOpen && step === 'initial') {
      setStep('profile');
    }
  }, [isProfileOpen]);

  if (step === 'initial') {
    return (
      <>
        <TutorialArrow 
          direction="right" 
          className="fixed right-[4.5rem] top-6"
        />
        <TutorialMessage className="fixed right-[6rem] top-[4.5rem]">
          I've created a profile for you here. Click to take a look.
        </TutorialMessage>
      </>
    );
  }

  if (step === 'profile') {
    return (
      <>
        <TutorialArrow 
          direction="down" 
          className="fixed right-48 top-32"
        />
        <TutorialMessage className="fixed right-24 top-44">
          Let's start by setting a goal. You can choose anything you like!
        </TutorialMessage>
      </>
    );
  }

  if (step === 'goals') {
    return (
      <>
        <TutorialArrow 
          direction="left" 
          className="fixed right-16 top-8"
        />
        <TutorialMessage className="fixed right-24 top-20">
          Nice! I'm looking forward to helping you make that happen. Let's close the profile screen for now.
        </TutorialMessage>
      </>
    );
  }

  return null;
};