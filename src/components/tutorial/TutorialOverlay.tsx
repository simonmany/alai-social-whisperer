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
import { Goal } from "@/types/goals";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'splash' | 'calendarintro' | 'contactsintro' | 'profileintro' | 'goalset' | 'goals' | 'complete'>('splash');
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0 });
  const [messagePosition, setMessagePosition] = useState({ top: 0, left: 0 });
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Watch for profile being opened and update step
  useEffect(() => {
    if (step === 'profileintro' && isProfileOpen) {
      setStep('goalset');
    }
  }, [isProfileOpen, step]);

  // Watch for goals being set
  useEffect(() => {
    if (step === 'goalset' && profile?.goals) {
      const goalsArray = profile.goals as Goal[];
      if (Array.isArray(goalsArray) && goalsArray.length > 0) {
        if (session?.user?.id) {
          handleTutorialComplete();
        }
      }
    }
  }, [profile?.goals, step, session?.user?.id]);

  // Update positions based on step
  useEffect(() => {
    const updatePositions = () => {
      if (step === 'calendarintro') {
        const calendarButton = document.querySelector('[aria-label="Open calendar"]');
        if (calendarButton) {
          const rect = calendarButton.getBoundingClientRect();
          setArrowPosition({ 
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2 - 20
          });
          setMessagePosition({
            top: rect.bottom + window.scrollY + 20,
            left: rect.left - 100
          });
        }
      } else if (step === 'contactsintro') {
        const contactsButton = document.querySelector('[aria-label="Open contacts"]');
        if (contactsButton) {
          const rect = contactsButton.getBoundingClientRect();
          setArrowPosition({ 
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2 - 20
          });
          setMessagePosition({
            top: rect.bottom + window.scrollY + 20,
            left: rect.left - 100
          });
        }
      } else if (step === 'profileintro') {
        const profileButton = document.querySelector('[aria-label="Open profile"]');
        if (profileButton) {
          const rect = profileButton.getBoundingClientRect();
          setArrowPosition({ 
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2 - 20
          });
          setMessagePosition({
            top: rect.bottom + window.scrollY + 20,
            left: rect.left - 200
          });
        }
      }
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [step]);

  const handleTutorialComplete = async () => {
    if (!session?.user.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_step: 'complete',
          has_completed_tutorial: true
        })
        .eq('id', session.user.id);

      queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
      setShowCompletionMessage(true);
      setTimeout(() => {
        setShowCompletionMessage(false);
        onComplete();
      }, 3000);
    } catch (error: any) {
      console.error('Error completing tutorial:', error);
      toast({
        title: "Error completing tutorial",
        description: error.message || "Please try again",
        variant: "destructive",
      });
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
            <div className="space-y-4">
              <p>First, let's connect your calendar so I can help you plan and track your social life.</p>
              <div className="flex gap-2">
                <Button onClick={() => setStep('contactsintro')}>
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
                <Button onClick={() => setStep('profileintro')}>
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
    }

    if (step === 'goalset') {
      return (
        <>
          <TutorialMessage 
            className="right-[450px] top-32 max-w-[300px]"
            style={{ zIndex: 99999 }}
          >
            Let's start by setting some goals. What would you like to achieve?
          </TutorialMessage>
        </>
    }

    if (step === 'goals' && !isProfileOpen) {
      return (
        <>
          <TutorialArrow 
            direction="left"
            style={{
              position: 'fixed',
              top: `${arrowPosition.top}px`,
              left: `${arrowPosition.left}px`,
            }}
          />
          <TutorialMessage 
            className="right-[450px] top-32 max-w-[300px]"
            style={{ zIndex: 99999 }}
          >
            Great! Now let's close this and move on.
          </TutorialMessage>
        </>
    }

    return null;
  };

  return createPortal(
    renderTutorialContent(),
    document.body
  );
};
