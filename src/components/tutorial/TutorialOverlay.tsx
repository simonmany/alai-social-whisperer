import { useEffect, useState } from "react";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    const updatePositions = () => {
      const profileButton = document.querySelector('button[aria-label="Open profile"]');
      
      if (profileButton) {
        const rect = profileButton.getBoundingClientRect();
        
        setArrowPosition({
          top: rect.bottom + 8,
          left: rect.left + (rect.width / 2) - 20
        });
        
        setMessagePosition({
          top: rect.bottom + 56,
          left: rect.left - 160 + (rect.width / 2)
        });
      }
    };

    const attempts = [0, 100, 500, 1000];
    attempts.forEach(delay => {
      setTimeout(updatePositions, delay);
    });
    
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, []);

  useEffect(() => {
    if (isProfileOpen && step === 'initial') {
      setStep('profile');
    }
  }, [isProfileOpen, step]);

  useEffect(() => {
    const updateTutorialStep = async () => {
      if (!session?.user.id) return;
      
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_step: step })
          .eq('id', session.user.id);

        if (error) throw error;

        if (step === 'complete') {
          const { error: completeError } = await supabase
            .from('profiles')
            .update({ has_completed_tutorial: true })
            .eq('id', session.user.id);

          if (completeError) throw completeError;
          
          onComplete();
        }
      } catch (error: any) {
        console.error('Error updating tutorial step:', error);
        toast({
          title: "Error updating tutorial progress",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    updateTutorialStep();
  }, [step, session?.user.id, onComplete, toast]);

  if (step === 'initial') {
    return (
      <div className="fixed inset-0 pointer-events-none">
        <TutorialArrow 
          direction="up" 
          style={{
            position: 'fixed',
            top: `${arrowPosition.top}px`,
            left: `${arrowPosition.left}px`,
          }}
        />
        <TutorialMessage 
          style={{
            position: 'fixed',
            top: `${messagePosition.top}px`,
            left: `${messagePosition.left}px`,
          }}
        >
          I've created a profile for you here. Click to take a look.
        </TutorialMessage>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="fixed inset-0 pointer-events-none">
        <TutorialMessage 
          className="right-[450px] top-32 max-w-xs"
        >
          Let's start by setting a goal. You can choose anything you like! Choosing a time horizon helps keep you accountable.
        </TutorialMessage>
        
        {/* All arrows now use the same z-index as messages via the TutorialArrow component */}
        <TutorialArrow 
          direction="right" 
          className="right-[400px] top-[380px]"
        />
        
        <TutorialArrow 
          direction="right" 
          className="right-[400px] top-[470px]"
        />
        
        <TutorialArrow 
          direction="right" 
          className="right-[400px] top-[560px]"
        />
      </div>
    );
  }

  if (step === 'goals') {
    return (
      <div className="fixed inset-0 pointer-events-none">
        <TutorialArrow 
          direction="left" 
          className="right-16 top-8"
        />
        <TutorialMessage className="right-24 top-20">
          Nice! I'm looking forward to helping you make that happen. Let's close the profile screen for now.
        </TutorialMessage>
      </div>
    );
  }

  return null;
};