import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [goalArrowPositions, setGoalArrowPositions] = useState<Position[]>([]);
  const { session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const updatePositions = () => {
      const profileButton = document.querySelector('button[aria-label="Open profile"]');
      
      if (profileButton) {
        const rect = profileButton.getBoundingClientRect();
        
        const newArrowPosition = {
          top: rect.bottom + 8,
          left: rect.left + (rect.width / 2) - 20
        };
        
        const newMessagePosition = {
          top: rect.bottom + 56,
          left: rect.left - 160 + (rect.width / 2)
        };
        
        setArrowPosition(newArrowPosition);
        setMessagePosition(newMessagePosition);
      }
    };

    const updateGoalArrowPositions = () => {
      if (step !== 'profile') return;
      
      const goalAlerts = document.querySelectorAll('[role="alert"]');
      const positions: Position[] = [];
      
      goalAlerts.forEach((alert) => {
        const rect = alert.getBoundingClientRect();
        positions.push({
          top: rect.top + (rect.height / 2) - 20,
          left: rect.left - 48
        });
      });
      
      if (positions.length > 0) {
        setGoalArrowPositions(positions);
      }
    };

    // Initial update
    const attempts = [0, 100, 500, 1000];
    attempts.forEach(delay => {
      setTimeout(() => {
        updatePositions();
        updateGoalArrowPositions();
      }, delay);
    });
    
    // Update on scroll and resize
    const handleUpdate = () => {
      updatePositions();
      updateGoalArrowPositions();
    };
    
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    // Set up an interval to periodically check positions
    const intervalId = setInterval(handleUpdate, 1000);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      clearInterval(intervalId);
    };
  }, [step]);

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

  const renderTutorialContent = () => {
    if (step === 'initial') {
      return (
        <>
          <TutorialArrow 
            direction="up" 
            style={{
              top: `${arrowPosition.top}px`,
              left: `${arrowPosition.left}px`,
            }}
          />
          <TutorialMessage 
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
          <TutorialMessage 
            className="right-[450px] top-32 max-w-xs"
          >
            Let's start by setting a goal. You can choose anything you like! Choosing a time horizon helps keep you accountable.
          </TutorialMessage>
          
          {goalArrowPositions.map((position, index) => (
            <TutorialArrow 
              key={index}
              direction="right" 
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
              }}
            />
          ))}
        </>
      );
    }

    if (step === 'goals') {
      return (
        <>
          <TutorialArrow 
            direction="left" 
            className="right-16 top-8"
          />
          <TutorialMessage className="right-24 top-20">
            Nice! I'm looking forward to helping you make that happen. Let's close the profile screen for now.
          </TutorialMessage>
        </>
      );
    }

    return null;
  };

  return createPortal(
    renderTutorialContent(),
    document.body
  );
};