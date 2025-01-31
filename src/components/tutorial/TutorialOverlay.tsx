import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

interface Position {
  top: number;
  left: number;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'initial' | 'profile' | 'goals' | 'contactsintro' | 'complete'>('initial');
  const [arrowPosition, setArrowPosition] = useState<Position>({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState<Position>({ top: 0, left: 0 });
  const [goalArrowPositions, setGoalArrowPositions] = useState<Position[]>([]);
  const [closeButtonPosition, setCloseButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [contactsButtonPosition, setContactsButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const { session } = useAuth();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('goals')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user.id
  });

  useEffect(() => {
    const updatePositions = () => {
      const profileButton = document.querySelector('button[aria-label="Open profile"]');
      const closeButton = document.querySelector('[data-state] button[class*="absolute right-4 top-4"]');
      const contactsButton = document.querySelector('button:has(.lucide-users)');
      
      console.log('Current step:', step);
      console.log('Close button found:', !!closeButton);
      console.log('Contacts button found:', !!contactsButton);
      
      if (profileButton) {
        const rect = profileButton.getBoundingClientRect();
        console.log('Profile button position:', rect);
        
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

      if (closeButton && step === 'goals') {
        const rect = closeButton.getBoundingClientRect();
        console.log('Close button position:', rect);
        
        const newPosition = {
          top: rect.top + (rect.height / 2) - 10,
          left: rect.left - 48
        };
        console.log('Setting close button arrow position to:', newPosition);
        
        setCloseButtonPosition(newPosition);
      }

      if (contactsButton && step === 'contactsintro') {
        const rect = contactsButton.getBoundingClientRect();
        console.log('Contacts button position:', rect);
        
        const newPosition = {
          top: rect.bottom + 8,
          left: rect.left + (rect.width / 2) - 20
        };
        console.log('Setting contacts button arrow position to:', newPosition);
        
        setContactsButtonPosition(newPosition);
      }
    };

    const updateGoalArrowPositions = () => {
      if (step !== 'profile') return;
      
      const goalAlerts = document.querySelectorAll('.space-y-4 [role="alert"]');
      console.log('Goal alerts found:', goalAlerts.length);
      
      const positions: Position[] = [];
      
      goalAlerts.forEach((alert, index) => {
        const rect = alert.getBoundingClientRect();
        console.log(`Goal alert ${index} position:`, rect);
        
        positions.push({
          top: rect.top + (rect.height / 2) - 20,
          left: rect.left - 48
        });
      });
      
      if (positions.length > 0) {
        console.log('Setting goal arrow positions:', positions);
        setGoalArrowPositions(positions);
      }
    };

    const attempts = [0, 100, 500, 1000];
    attempts.forEach(delay => {
      setTimeout(() => {
        console.log(`Running position update attempt after ${delay}ms`);
        updatePositions();
        updateGoalArrowPositions();
      }, delay);
    });
    
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions, true);

    const intervalId = setInterval(() => {
      updatePositions();
      updateGoalArrowPositions();
    }, 1000);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, true);
      clearInterval(intervalId);
    };
  }, [step]);

  useEffect(() => {
    if (isProfileOpen && step === 'initial') {
      setStep('profile');
    }
    if (!isProfileOpen && (step === 'goals' || step === 'profile')) {
      setStep('initial');
    }
  }, [isProfileOpen, step]);

  useEffect(() => {
    if (step === 'profile' && profile?.goals && Array.isArray(profile.goals) && profile.goals.length > 0) {
      setStep('goals');
    }
  }, [profile?.goals, step]);

  useEffect(() => {
    if (!isProfileOpen && step === 'goals') {
      setStep('contactsintro');
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
            direction="right"
            style={{
              position: 'fixed',
              top: `${closeButtonPosition.top}px`,
              left: `${closeButtonPosition.left}px`,
              zIndex: 9999,
            }}
          />
          <TutorialMessage className="right-24 top-20">
            Nice! I'm looking forward to helping you make that happen. Let's close the profile screen for now.
          </TutorialMessage>
        </>
      );
    }

    if (step === 'contactsintro') {
      return (
        <>
          <TutorialArrow 
            direction="up"
            style={{
              position: 'fixed',
              top: `${contactsButtonPosition.top}px`,
              left: `${contactsButtonPosition.left}px`,
            }}
          />
          <TutorialMessage 
            style={{
              position: 'fixed',
              top: `${contactsButtonPosition.top + 48}px`,
              left: `${contactsButtonPosition.left - 160 + 20}px`,
            }}
          >
            Great! Now let's add some contacts to help you achieve your goals.
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