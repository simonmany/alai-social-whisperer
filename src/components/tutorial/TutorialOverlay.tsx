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

interface GoalButtonPositions {
  today: Position | null;
  week: Position | null;
  month: Position | null;
  messagePosition: Position | null;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'initial' | 'profile' | 'goals' | 'complete'>('initial');
  const [arrowPosition, setArrowPosition] = useState<Position>({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState<Position>({ top: 0, left: 0 });
  const [goalPositions, setGoalPositions] = useState<GoalButtonPositions>({
    today: null,
    week: null,
    month: null,
    messagePosition: null
  });
  const { session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const updatePositions = () => {
      // Find profile button for initial step
      const profileButton = document.querySelector('button[aria-label="Open profile"]');
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

      // Find goal buttons for profile step
      if (step === 'profile') {
        const alerts = Array.from(document.querySelectorAll('.alert-destructive'));
        const goalAlerts = alerts.filter(alert => 
          (alert as HTMLElement).textContent?.includes('Goal Missing')
        );

        if (goalAlerts.length > 0) {
          const positions: GoalButtonPositions = {
            today: null,
            week: null,
            month: null,
            messagePosition: null
          };

          goalAlerts.forEach((alert, index) => {
            const rect = alert.getBoundingClientRect();
            const timeframe = index === 0 ? 'today' : index === 1 ? 'week' : 'month';
            positions[timeframe] = {
              top: rect.top + (rect.height / 2) - 20,
              left: rect.left - 48 // Position arrow to the left of the alert
            };
          });

          // Position message next to the middle arrow
          if (positions.week) {
            positions.messagePosition = {
              top: positions.week.top - 40,
              left: positions.week.left - 320 // Position message to the left of the arrows
            };
          }

          setGoalPositions(positions);
        }
      }
    };

    // Update positions immediately and after a short delay
    const attempts = [0, 100, 500, 1000];
    attempts.forEach(delay => {
      setTimeout(updatePositions, delay);
    });

    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [step, isProfileOpen]);

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

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 100
  };

  if (step === 'initial') {
    return (
      <div style={overlayStyle}>
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
      <div style={overlayStyle}>
        {goalPositions.messagePosition && (
          <TutorialMessage 
            style={{
              position: 'fixed',
              top: `${goalPositions.messagePosition.top}px`,
              left: `${goalPositions.messagePosition.left}px`,
            }}
          >
            Let's start by setting a goal. You can choose anything you like! Choosing a time horizon helps keep you accountable.
          </TutorialMessage>
        )}
        
        {goalPositions.today && (
          <TutorialArrow 
            direction="right" 
            style={{
              position: 'fixed',
              top: `${goalPositions.today.top}px`,
              left: `${goalPositions.today.left}px`,
              zIndex: 200
            }}
          />
        )}
        
        {goalPositions.week && (
          <TutorialArrow 
            direction="right" 
            style={{
              position: 'fixed',
              top: `${goalPositions.week.top}px`,
              left: `${goalPositions.week.left}px`,
              zIndex: 200
            }}
          />
        )}
        
        {goalPositions.month && (
          <TutorialArrow 
            direction="right" 
            style={{
              position: 'fixed',
              top: `${goalPositions.month.top}px`,
              left: `${goalPositions.month.left}px`,
              zIndex: 200
            }}
          />
        )}
      </div>
    );
  }

  if (step === 'goals') {
    return (
      <div style={overlayStyle}>
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
