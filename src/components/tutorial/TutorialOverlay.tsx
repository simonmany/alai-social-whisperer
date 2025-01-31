import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

interface Position {
  top: number;
  left: number;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'initial' | 'profile' | 'goals' | 'contactsintro' | 'contactsopen' | 'calendarintro' | 'complete'>('initial');
  const [arrowPosition, setArrowPosition] = useState<Position>({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState<Position>({ top: 0, left: 0 });
  const [goalArrowPositions, setGoalArrowPositions] = useState<Position[]>([]);
  const [closeButtonPosition, setCloseButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [contactsButtonPosition, setContactsButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [calendarButtonPosition, setCalendarButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [hasGoals, setHasGoals] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Query to get the current tutorial step from the profile
  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step, has_completed_tutorial')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  // Sync step with profile data
  useEffect(() => {
    if (profile?.onboarding_step) {
      console.log('Syncing tutorial step with profile:', profile.onboarding_step);
      setStep(profile.onboarding_step as any);
    }
  }, [profile?.onboarding_step]);

  useEffect(() => {
    console.log('Tutorial step changed to:', step);
  }, [step]);

  // Handle route changes
  useEffect(() => {
    const updateTutorialStep = async () => {
      if (location.pathname === '/contacts' && step === 'contactsintro' && session?.user?.id) {
        console.log('Contacts page opened, moving to contactsopen step');
        
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ onboarding_step: 'contactsopen' })
            .eq('id', session.user.id);

          if (error) {
            console.error('Error updating onboarding step:', error);
            return;
          }

          console.log('Updated onboarding step to contactsopen');
          setStep('contactsopen');
          // Invalidate the profile query to ensure it refetches
          queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
        } catch (error) {
          console.error('Error in updateTutorialStep:', error);
        }
      }
    };

    updateTutorialStep();
  }, [location.pathname, step, session?.user?.id, queryClient]);

  // Check for goals when profile is opened
  useEffect(() => {
    const checkGoals = async () => {
      if (!session?.user.id || !isProfileOpen || step !== 'profile') return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('goals')
          .eq('id', session.user.id)
          .single();

        const goalsExist = profile?.goals && Array.isArray(profile.goals) && profile.goals.length > 0;
        console.log('Goals check:', goalsExist ? 'Goals found' : 'No goals yet');
        setHasGoals(goalsExist);
        
        if (goalsExist) {
          setStep('goals');
        }
      } catch (error) {
        console.error('Error checking goals:', error);
      }
    };

    checkGoals();
  }, [session?.user.id, isProfileOpen, step]);

  // Handle profile open/close transitions
  useEffect(() => {
    if (isProfileOpen && step === 'initial') {
      console.log('Profile opened, moving to profile step');
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .update({ onboarding_step: 'profile' })
          .eq('id', session.user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating onboarding step:', error);
            else {
              console.log('Updated onboarding step to profile');
              setStep('profile');
            }
          });
      }
    }
    if (!isProfileOpen && step === 'goals') {
      console.log('Profile closed, moving to contactsintro step');
      
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .update({ onboarding_step: 'contactsintro' })
          .eq('id', session.user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating onboarding step:', error);
            else {
              console.log('Updated onboarding step to contactsintro');
              setStep('contactsintro');
            }
          });
      }
    }
  }, [isProfileOpen, step, session?.user?.id]);

  useEffect(() => {
    const updatePositions = () => {
      const profileButton = document.querySelector('button[aria-label="Open profile"]');
      const closeButton = document.querySelector('[data-state] button[class*="absolute right-4 top-4"]');
      const contactsButton = document.querySelector('button:has(.lucide-users)');
      const calendarButton = document.querySelector('button:has(.lucide-calendar)');
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

      if (contactsButton && (step === 'contactsintro' || step === 'contactsopen')) {
        const rect = contactsButton.getBoundingClientRect();
        setContactsButtonPosition({
          top: rect.bottom + 8,
          left: rect.left + (rect.width / 2) - 20
        });
        
        setMessagePosition({
          top: rect.bottom + 56,
          left: rect.left - 160 + (rect.width / 2)
        });
      }

      if (calendarButton && step === 'calendarintro') {
        const rect = calendarButton.getBoundingClientRect();
        setCalendarButtonPosition({
          top: rect.bottom + 8,
          left: rect.left + (rect.width / 2) - 20
        });
        
        setMessagePosition({
          top: rect.bottom + 56,
          left: rect.left - 160 + (rect.width / 2)
        });
      }

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

    if (step === 'goals' && hasGoals) {
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
              top: `${messagePosition.top}px`,
              left: `${messagePosition.left}px`,
            }}
          >
            Great! Now let's add some contacts to help you achieve your goals.
          </TutorialMessage>
        </>
      );
    }

    if (step === 'calendarintro') {
      return (
        <>
          <TutorialArrow 
            direction="up"
            style={{
              position: 'fixed',
              top: `${calendarButtonPosition.top}px`,
              left: `${calendarButtonPosition.left}px`,
            }}
          />
          <TutorialMessage 
            style={{
              position: 'fixed',
              top: `${messagePosition.top}px`,
              left: `${messagePosition.left}px`,
            }}
          >
            Let's check out your calendar to start planning some activities!
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
