import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TypewriterText } from "@/components/TypewriterText";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

type TutorialStep = 'splash' | 'calendarintro' | 'contactsintro' | 'profileintro' | 'goalset' | 'complete';

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState({ top: 0, left: 0 });
  const [goalArrowPositions, setGoalArrowPositions] = useState<{ top: number; left: number }[]>([]);
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step, has_completed_tutorial, goals, display_name')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      console.log('Profile data:', data);
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 30000
  });

  useEffect(() => {
    console.log('Tutorial step:', profile?.onboarding_step);
    console.log('Profile data:', profile);
    console.log('Is profile open?', isProfileOpen);
  }, [profile, isProfileOpen]);

  useEffect(() => {
    if (profile?.onboarding_step === 'profileintro' && isProfileOpen) {
      console.log('Profile opened, transitioning to goalset');
      
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .update({ onboarding_step: 'goalset' })
          .eq('id', session.user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating onboarding step:', error);
            else {
              queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
            }
          });
      }
    }
  }, [isProfileOpen, profile?.onboarding_step, session?.user?.id, queryClient]);

  const updatePositions = () => {
    if (profile?.onboarding_step === 'calendarintro') {
      const calendarButton = document.querySelector('[aria-label="Open calendar"]');
      if (calendarButton) {
        const rect = calendarButton.getBoundingClientRect();
        setArrowPosition({ 
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 20
        });
        setMessagePosition({
          top: rect.bottom + 50,
          left: rect.left - 100
        });
      }
    } else if (profile?.onboarding_step === 'contactsintro') {
      const contactsButton = document.querySelector('[aria-label="Open contacts"]');
      if (contactsButton) {
        const rect = contactsButton.getBoundingClientRect();
        setArrowPosition({ 
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 20
        });
        setMessagePosition({
          top: rect.bottom + 50,
          left: rect.left - 100
        });
      }
    } else if (profile?.onboarding_step === 'profileintro') {
      const profileButton = document.querySelector('[aria-label="Open profile"]');
      if (profileButton) {
        const rect = profileButton.getBoundingClientRect();
        setArrowPosition({ 
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 20
        });
        setMessagePosition({
          top: rect.bottom + 50,
          left: rect.left - 200
        });
      }
    } else if (profile?.onboarding_step === 'goalset') {
      // Find all clickable goal alerts (excluding the top warning message)
      const goalAlerts = Array.from(document.querySelectorAll('[role="alert"]')).filter(alert => {
        // Check if the alert is clickable (wrapped in a button/has onClick)
        return alert.closest('div[role="alert"]')?.hasAttribute('onclick') || 
               alert.closest('div[role="alert"]')?.classList.contains('cursor-pointer');
      });
      
      console.log('Found goal alerts:', goalAlerts.length);
      
      const positions: { top: number; left: number }[] = [];
      
      goalAlerts.forEach((alert) => {
        const rect = alert.getBoundingClientRect();
        positions.push({
          top: rect.top + (rect.height / 2) - 20,
          left: rect.left - 60
        });
        console.log('Alert position:', { top: rect.top, left: rect.left, height: rect.height });
      });
      
      console.log('Goal arrow positions:', positions);
      setGoalArrowPositions(positions);
    }
  };

  useEffect(() => {
    updatePositions();
    window.addEventListener('resize', updatePositions);
    
    // Add a small delay to ensure the DOM is fully rendered
    const timeout = setTimeout(updatePositions, 100);
    
    return () => {
      window.removeEventListener('resize', updatePositions);
      clearTimeout(timeout);
    };
  }, [profile?.onboarding_step, isProfileOpen]);

  const handleStepChange = async (newStep: TutorialStep) => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: newStep })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error updating onboarding step:', error);
        toast({
          title: "Error updating tutorial progress",
          description: "Please try again",
          variant: "destructive",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
      }
    } catch (error) {
      console.error('Error updating step:', error);
    }
  };

  const renderTutorialContent = () => {
    if (isProfileLoading || !profile) {
      return null;
    }

    if (showCompletionMessage) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[9999]">
          <div className="text-2xl">
            <TypewriterText
              text="That's it! I'm looking forward to being your Alai."
              delay={0}
              onComplete={() => {}}
            />
          </div>
        </div>
      );
    }

    const step = profile.onboarding_step as TutorialStep;

    if (step === 'splash') {
      const userName = profile?.display_name || 'there';
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="max-w-xl space-y-8 p-8">
            <div className="relative space-y-6">
              <div className="min-h-[4rem]">
                {!hasPlayedLine1 && (
                  <TypewriterText
                    text={`Hi ${userName}, it's nice to meet you.`}
                    delay={250}
                    typingSpeed={25}
                    className="text-4xl font-cormorant block"
                    onComplete={() => setHasPlayedLine1(true)}
                  />
                )}
                {hasPlayedLine1 && (
                  <div className="text-4xl font-cormorant">{`Hi ${userName}, it's nice to meet you.`}</div>
                )}
              </div>
              
              <div className="min-h-[3rem]">
                {hasPlayedLine1 && !hasPlayedLine2 && (
                  <TypewriterText
                    text="I'm excited for our journey together."
                    delay={250}
                    typingSpeed={25}
                    className="text-lg block"
                    onComplete={() => setHasPlayedLine2(true)}
                  />
                )}
                {hasPlayedLine2 && (
                  <div className="text-lg">I'm excited for our journey together.</div>
                )}
              </div>
              
              <div className="min-h-[3rem]">
                {hasPlayedLine2 && !hasPlayedLine3 && (
                  <TypewriterText
                    text="Ready to get started?"
                    delay={250}
                    typingSpeed={25}
                    className="text-lg block"
                    onComplete={() => setHasPlayedLine3(true)}
                  />
                )}
                {hasPlayedLine3 && (
                  <div className="text-lg">Ready to get started?</div>
                )}
              </div>
            </div>
            
            {hasPlayedLine3 && (
              <Button 
                onClick={() => handleStepChange('calendarintro')}
                size="lg"
                className="w-full animate-fade-in"
              >
                Let's go!
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (step === 'calendarintro') {
      return (
        <>
          <TutorialArrow 
            direction="up"
            style={{
              position: 'fixed',
              top: `${arrowPosition.top}px`,
              left: `${arrowPosition.left}px`,
              zIndex: 50
            }}
          />
          <TutorialMessage 
            style={{
              position: 'fixed',
              top: `${messagePosition.top}px`,
              left: `${messagePosition.left}px`,
              zIndex: 50
            }}
          >
            <div className="space-y-4">
              <p>Connecting your calendar will help me plan events for you smoothly.</p>
              <div className="flex gap-2">
                <Button onClick={() => handleStepChange('contactsintro')}>
                  Connect Calendar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleStepChange('contactsintro')}
                >
                  Not Now
                </Button>
              </div>
            </div>
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
              top: `${arrowPosition.top}px`,
              left: `${arrowPosition.left}px`,
              zIndex: 50
            }}
          />
          <TutorialMessage 
            style={{
              position: 'fixed',
              top: `${messagePosition.top}px`,
              left: `${messagePosition.left}px`,
              zIndex: 50
            }}
          >
            <div className="space-y-4">
              <p>Let's add some contacts to help you achieve your goals.</p>
              <div className="flex gap-2">
                <Button onClick={() => handleStepChange('profileintro')}>
                  Connect Contacts
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleStepChange('profileintro')}
                >
                  Not Now
                </Button>
              </div>
            </div>
          </TutorialMessage>
        </>
      );
    }

    if (step === 'profileintro') {
      return (
        <>
          <TutorialArrow 
            direction="up"
            style={{
              position: 'fixed',
              top: `${arrowPosition.top}px`,
              left: `${arrowPosition.left}px`,
              zIndex: 50
            }}
          />
          <TutorialMessage 
            style={{
              position: 'fixed',
              top: `${messagePosition.top}px`,
              left: `${messagePosition.left}px`,
              zIndex: 50
            }}
          >
            <div className="space-y-4">
              <p>I've created a profile for you here. Click to take a look.</p>
            </div>
          </TutorialMessage>
        </>
      );
    }

    if (step === 'goalset') {
      return (
        <>
          {goalArrowPositions.map((position, index) => (
            <TutorialArrow
              key={index}
              direction="right"
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 99999
              }}
            />
          ))}
          <TutorialMessage 
            className="fixed right-[450px] top-32 max-w-[300px] z-[99999]"
          >
            Let's start by setting some goals. What would you like to achieve?
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
