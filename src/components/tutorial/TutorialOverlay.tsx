import { useEffect, useState, useRef } from "react";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

interface Position {
  top: number;
  left: number;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'initial' | 'profile' | 'goals' | 'complete'>('initial');
  const [arrowPosition, setArrowPosition] = useState<Position>({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState<Position>({ top: 0, left: 0 });
  const { session } = useAuth();

  useEffect(() => {
    // Find the profile button by its unique characteristics
    const profileButton = document.querySelector('[aria-label="Open profile"]');
    
    const updatePositions = () => {
      if (profileButton) {
        const rect = profileButton.getBoundingClientRect();
        
        // Position arrow below the profile button
        setArrowPosition({
          top: rect.bottom + 8, // 8px gap
          left: rect.left + (rect.width / 2) - 20, // Center arrow (arrow width is 40px)
        });
        
        // Position message below the arrow
        setMessagePosition({
          top: rect.bottom + 56, // Arrow height (40px) + gaps
          left: rect.left - 100, // Offset to center message
        });
      }
    };

    // Update positions initially and on window resize
    updatePositions();
    window.addEventListener('resize', updatePositions);

    return () => window.removeEventListener('resize', updatePositions);
  }, []);

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

  useEffect(() => {
    if (isProfileOpen && step === 'initial') {
      setStep('profile');
    }
  }, [isProfileOpen]);

  if (step === 'initial') {
    return (
      <>
        <TutorialArrow 
          direction="up" 
          className="fixed"
          style={{
            top: `${arrowPosition.top}px`,
            left: `${arrowPosition.left}px`,
          }}
        />
        <TutorialMessage 
          className="fixed"
          style={{
            top: `${messagePosition.top}px`,
            left: `${messagePosition.left}px`,
          }}
        >
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