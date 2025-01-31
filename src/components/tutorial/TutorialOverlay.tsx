import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

interface Position {
  top: number;
  left: number;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'initial' | 'profile' | 'goals' | 'contactsintro' | 'contactsopen' | 'complete'>('initial');
  const [arrowPosition, setArrowPosition] = useState<Position>({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState<Position>({ top: 0, left: 0 });
  const [goalArrowPositions, setGoalArrowPositions] = useState<Position[]>([]);
  const [closeButtonPosition, setCloseButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [contactsButtonPosition, setContactsButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const { session } = useAuth();
  const { toast } = useToast();

  // Add a new effect to check for existing goals
  useEffect(() => {
    const checkGoals = async () => {
      if (!session?.user.id || !isProfileOpen || step !== 'profile') return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('goals')
          .eq('id', session.user.id)
          .single();

        // If goals exist and we're in profile step, move to goals step
        if (profile?.goals && Array.isArray(profile.goals) && profile.goals.length > 0) {
          setStep('goals');
        }
      } catch (error) {
        console.error('Error checking goals:', error);
      }
    };

    checkGoals();
  }, [session?.user.id, isProfileOpen, step]);

  useEffect(() => {
    const updatePositions = () => {
      const profileButton = document.querySelector('button[aria-label="Open profile"]');
      const closeButton = document.querySelector('[data-state] button[class*="absolute right-4 top-4"]');
      const contactsButton = document.querySelector('button:has(.lucide-users)');
      const goalAlerts = document.querySelectorAll('.space-y-4 [role="alert"]');
      
      if (profileButton && step === 'initial') {
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

      if (closeButton && step === 'goals') {
        const rect = closeButton.getBoundingClientRect();
        setCloseButtonPosition({
          top: rect.top + (rect.height / 2) - 10,
          left: rect.left - 48
        });
      }

      if (contactsButton && step === 'contactsintro') {
        const rect = contactsButton.getBoundingClientRect();
        setContactsButtonPosition({
          top: rect.bottom + 8,
          left: rect.left + (rect.width / 2) - 20
        });
      }

      // Update goal arrow positions
      if (step === 'profile' && goalAlerts.length > 0) {
        const positions: Position[] = [];
        goalAlerts.forEach((alert) => {
          const rect = alert.getBoundingClientRect();
          positions.push({
            top: rect.top + (rect.height / 2) - 20,
            left: rect.left - 48
          });
        });
        setGoalArrowPositions(positions);
      }
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions, true);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, true);
    };
  }, [step]);

  useEffect(() => {
    if (isProfileOpen && step === 'initial') {
      setStep('profile');
    }
    if (!isProfileOpen && (step === 'goals' || step === 'profile')) {
      setStep('contactsintro');
    }
  }, [isProfileOpen, step]);

  const handleSkipContacts = async () => {
    if (!session?.user.id) return;
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_step: 'complete',
          has_completed_tutorial: true 
        })
        .eq('id', session.user.id);
      
      setStep('complete');
      onComplete();
    } catch (error: any) {
      console.error('Error updating tutorial progress:', error);
      toast({
        title: "Error updating tutorial progress",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
                zIndex: 9999,
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

    if (step === 'contactsopen') {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md text-center space-y-6">
            <p className="text-lg">
              Your relationships are a beautiful Constellation, but right now it's a bit empty.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={handleSkipContacts}>
                Connect Contacts
              </Button>
              <Button variant="outline" onClick={handleSkipContacts}>
                Not Now
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return createPortal(
    renderTutorialContent(),
    document.body
  );
};