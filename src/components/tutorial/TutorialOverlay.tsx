import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TutorialArrow } from "./TutorialArrow";
import { TutorialMessage } from "./TutorialMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TypewriterText } from "@/components/TypewriterText";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

interface Position {
  top: number;
  left: number;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'splash' | 'calendarintro' | 'contactsintro' | 'profileintro' | 'goalset' | 'goals' | 'complete'>('splash');
  const [arrowPosition, setArrowPosition] = useState<Position>({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState<Position>({ top: 0, left: 0 });
  const [goalArrowPositions, setGoalArrowPositions] = useState<Position[]>([]);
  const [closeButtonPosition, setCloseButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [contactsButtonPosition, setContactsButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [calendarButtonPosition, setCalendarButtonPosition] = useState<Position>({ top: 0, left: 0 });
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Watch for profile being opened and update step
  useEffect(() => {
    if (step === 'profileintro' && isProfileOpen) {
      setStep('goalset');
    }
  }, [isProfileOpen, step]);

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step, has_completed_tutorial, goals, display_name')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  useEffect(() => {
    if (step === 'profileintro') {
      const profileButton = document.querySelector('[aria-label="Open profile"]');
      if (profileButton) {
        const rect = profileButton.getBoundingClientRect();
        setArrowPosition({
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 20
        });
        setMessagePosition({
          top: rect.bottom + 50,
          left: rect.left - 100
        });
      }
    } else if (step === 'calendarintro') {
      const calendarButton = document.querySelector('[aria-label="Open calendar"]');
      if (calendarButton) {
        const rect = calendarButton.getBoundingClientRect();
        setCalendarButtonPosition({
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 20
        });
        setMessagePosition({
          top: rect.bottom + 50,
          left: rect.left - 100
        });
      }
    } else if (step === 'contactsintro') {
      const contactsButton = document.querySelector('[aria-label="Open contacts"]');
      if (contactsButton) {
        const rect = contactsButton.getBoundingClientRect();
        setContactsButtonPosition({
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2 - 20
        });
        setMessagePosition({
          top: rect.bottom + 50,
          left: rect.left - 100
        });
      }
    } else if (step === 'goalset') {
      // Track all "Goal Missing" buttons within the profile sheet
      const goalButtons = document.querySelectorAll('.cursor-pointer.hover\\:bg-destructive\\/90');
      const positions = Array.from(goalButtons).map(button => {
        const rect = button.getBoundingClientRect();
        return {
          top: rect.top + rect.height / 2,
          left: rect.left - 40  // Position arrow to the left of the button
        };
      });
      setGoalArrowPositions(positions);
    }
  }, [step, isProfileOpen]);

  const handleTutorialComplete = async () => {
    if (!session?.user.id) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_step: 'complete',
          has_completed_tutorial: true 
        })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error completing tutorial:', error);
        return;
      }

      setShowCompletionMessage(true);
      setTimeout(() => {
        setShowCompletionMessage(false);
        onComplete();
      }, 3000);
    } catch (error) {
      console.error('Error in handleTutorialComplete:', error);
    }
  };

  const renderTutorialContent = () => {
    if (showCompletionMessage) {
      return (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-background/80 backdrop-blur-sm">
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

    if (step === 'splash') {
      const userName = profile?.display_name || 'there';
      
      return (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-background/80 backdrop-blur-sm">
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
                onClick={() => {
                  if (session?.user?.id) {
                    supabase
                      .from('profiles')
                      .update({ 
                        onboarding_step: 'calendarintro',
                        has_completed_tutorial: false
                      })
                      .eq('id', session.user.id)
                      .then(({ error }) => {
                        if (error) console.error('Error updating onboarding step:', error);
                        else {
                          setStep('calendarintro');
                          queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
                        }
                      });
                  }
                }}
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
            <div className="space-y-4">
              <p>First, let's connect your calendar so I can help you plan and track your social life.</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep('contactsintro')}
                >
                  Connect Calendar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setStep('contactsintro')}
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
            <div className="space-y-4">
              <p>Let's add some contacts to help you achieve your goals.</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setStep('profileintro')}
                >
                  Connect Contacts
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setStep('profileintro')}
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

    if (step === 'goalset') {
      return (
        <>
          <TutorialMessage 
            className="right-[450px] top-32 max-w-[300px]"
            style={{ zIndex: 9999 }}
          >
            Let's start by setting some goals. What would you like to achieve?
          </TutorialMessage>
          {goalArrowPositions.map((pos, index) => (
            <TutorialArrow
              key={index}
              direction="right"
              style={{
                position: 'fixed',
                top: `${pos.top}px`,
                left: `${pos.left}px`,
                zIndex: 9999
              }}
            />
          ))}
        </>
      );
    }

    if (step === 'goals' && !isProfileOpen) {
      return (
        <>
          <TutorialArrow 
            direction="left"
            style={{
              position: 'fixed',
              top: `${closeButtonPosition.top}px`,
              left: `${closeButtonPosition.left}px`,
              zIndex: 9999
            }}
          />
          <TutorialMessage 
            className="right-[450px] top-32 max-w-[300px]"
            style={{ zIndex: 9999 }}
          >
            Great! Now let's close this and move on.
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