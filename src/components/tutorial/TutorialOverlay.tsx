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
      console.log('Updating positions...'); // Debug log
      
      // Try to find the profile button
      const profileButton = document.querySelector('button[aria-label="Open profile"]');
      console.log('Profile button found:', !!profileButton); // Debug log
      
      if (profileButton) {
        const rect = profileButton.getBoundingClientRect();
        console.log('Button rect:', rect);
        
        // Calculate new positions
        const newArrowPosition = {
          top: rect.bottom + 8,
          left: rect.left + (rect.width / 2) - 20 // Center the 40px wide arrow
        };
        
        const newMessagePosition = {
          top: rect.bottom + 56, // Arrow (40px) + gaps
          left: rect.left - 160 + (rect.width / 2) // Center the message
        };
        
        console.log('New positions:', {
          arrow: newArrowPosition,
          message: newMessagePosition
        });
        
        setArrowPosition(newArrowPosition);
        setMessagePosition(newMessagePosition);
      } else {
        console.error('Profile button not found!');
      }
    };

    // Try multiple times to find the button
    const attempts = [0, 100, 500, 1000]; // Try immediately, then after 100ms, 500ms, and 1000ms
    attempts.forEach(delay => {
      setTimeout(updatePositions, delay);
    });
    
    // Update on window resize
    window.addEventListener('resize', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
    };
  }, []);

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

  useEffect(() => {
    if (isProfileOpen && step === 'initial') {
      setStep('profile');
    }
  }, [isProfileOpen, step]);

  if (step === 'initial') {
    return (
      <>
        <TutorialArrow 
          direction="up" 
          style={{
            position: 'fixed',
            top: `${arrowPosition.top}px`,
            left: `${arrowPosition.left}px`,
            zIndex: 50,
          }}
        />
        <TutorialMessage 
          style={{
            position: 'fixed',
            top: `${messagePosition.top}px`,
            left: `${messagePosition.left}px`,
            zIndex: 50,
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