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
import { Goal } from "@/types/goals";

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
  const [isUpdatingStep, setIsUpdatingStep] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      console.log('Fetching profile for tutorial:', session.user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step, has_completed_tutorial, goals, display_name')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error loading tutorial",
          description: "Please refresh the page",
          variant: "destructive",
        });
        throw error;
      }
      console.log('Fetched profile for tutorial:', data);
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000)
  });

  useEffect(() => {
    if (!isProfileLoading) {
      console.log('Tutorial profile state:', {
        step: profile?.onboarding_step,
        hasCompletedTutorial: profile?.has_completed_tutorial,
        isProfileOpen
      });
    }
  }, [profile, isProfileLoading, isProfileOpen]);

  useEffect(() => {
    if (profile?.onboarding_step === 'profileintro' && isProfileOpen) {
      console.log('Profile opened, transitioning to goalset');
      handleStepChange('goalset');
    }
  }, [isProfileOpen, profile?.onboarding_step]);

  useEffect(() => {
    if (profile?.onboarding_step === 'goalset' && profile.goals) {
      const goalsArray = profile.goals as (string | Goal)[];
      
      const hasTimeframeGoal = goalsArray.some(goal => 
        typeof goal === 'object' && 'timeframe' in goal
      );

      if (hasTimeframeGoal && !isUpdatingStep) {
        handleStepChange('complete');
        setShowCompletionMessage(true);
      }
    }
  }, [profile?.goals, profile?.onboarding_step, isUpdatingStep]);

  useEffect(() => {
    if (showCompletionMessage) {
      const completionTimeout = setTimeout(() => {
        setShowCompletionMessage(false);
        try {
          onComplete();
        } catch (error) {
          console.error('Error in completion callback:', error);
          toast({
            title: "Error completing tutorial",
            description: "Please refresh the page",
            variant: "destructive",
          });
        }
      }, 3000);

      return () => {
        clearTimeout(completionTimeout);
        if (session?.user?.id) {
          supabase
            .from('profiles')
            .update({ has_completed_tutorial: true })
            .eq('id', session.user.id);
        }
      };
    }
  }, [showCompletionMessage, session?.user?.id]);

  useEffect(() => {
    if (!isProfileLoading && profile?.onboarding_step === 'splash' && hasPlayedLine3) {
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .update({ 
            onboarding_step: 'complete',
            has_completed_tutorial: true 
          })
          .eq('id', session.user.id)
          .then(() => {
            setShowCompletionMessage(true);
            setTimeout(() => {
              setShowCompletionMessage(false);
              onComplete();
            }, 500);
          });
      }
    }
  }, [isProfileLoading, profile?.onboarding_step, hasPlayedLine3, session?.user?.id]);

  const updatePositions = () => {
    const container = document.body;
    if (!container) return;

    if (profile?.onboarding_step === 'calendarintro') {
      const calendarButton = document.querySelector('[aria-label="Open calendar"]');
      if (!calendarButton) {
        setTimeout(() => handleStepChange('contactsintro'), 1000);
        return;
      }
      const rect = calendarButton.getBoundingClientRect();
      setArrowPosition({ 
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2 - 20
      });
      setMessagePosition({
        top: rect.bottom + 50,
        left: rect.left - 100
      });
    } else if (profile?.onboarding_step === 'contactsintro') {
      const contactsButton = document.querySelector('[aria-label="Open contacts"]');
      if (!contactsButton) {
        setTimeout(() => handleStepChange('profileintro'), 1000);
        return;
      }
      const rect = contactsButton.getBoundingClientRect();
      setArrowPosition({ 
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2 - 20
      });
      setMessagePosition({
        top: rect.bottom + 50,
        left: rect.left - 100
      });
    } else if (profile?.onboarding_step === 'profileintro') {
      const profileButton = document.querySelector('[aria-label="Open profile"]');
      if (!profileButton) {
        setTimeout(() => handleStepChange('goalset'), 1000);
        return;
      }
      const rect = profileButton.getBoundingClientRect();
      setArrowPosition({ 
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2 - 20
      });
      setMessagePosition({
        top: rect.bottom + 50,
        left: rect.left - 200
      });
    } else if (profile?.onboarding_step === 'goalset') {
      const goalAlerts = Array.from(document.querySelectorAll('[role="alert"]')).filter((alert) => {
        return alert.closest('div[role="alert"]')?.hasAttribute('onclick') || 
               alert.closest('div[role="alert"]')?.classList.contains('cursor-pointer');
      });
      
      if (goalAlerts.length === 0) return;
      
      const positions: { top: number; left: number }[] = [];
      
      goalAlerts.forEach((alert) => {
        const rect = alert.getBoundingClientRect();
        positions.push({
          top: rect.top + (rect.height / 2) - 20,
          left: rect.left - 60
        });
      });
      
      setGoalArrowPositions(positions);
    }
  };

  useEffect(() => {
    updatePositions();
    window.addEventListener('resize', updatePositions);
    
    const timeout = setTimeout(updatePositions, 100);
    
    return () => {
      window.removeEventListener('resize', updatePositions);
      clearTimeout(timeout);
      
      if (session?.user?.id && profile?.onboarding_step && profile.onboarding_step !== 'complete') {
        supabase
          .from('profiles')
          .update({ 
            onboarding_step: 'complete',
            has_completed_tutorial: true 
          })
          .eq('id', session.user.id);
      }
    };
  }, [profile?.onboarding_step, isProfileOpen, session?.user?.id]);

  const handleStepChange = async (newStep: TutorialStep) => {
    if (!session?.user?.id || isUpdatingStep) return;

    setIsUpdatingStep(true);
    const retryCount = 3;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            onboarding_step: newStep,
            ...(newStep === 'complete' ? { has_completed_tutorial: true } : {})
          })
          .eq('id', session.user.id);

        if (!error) {
          queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
          setIsUpdatingStep(false);
          return;
        }
        
        if (i === retryCount - 1) {
          toast({
            title: "Error updating tutorial progress",
            description: "Please try again or refresh the page",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error updating step:', error);
      }
      if (i < retryCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsUpdatingStep(false);
  };

  const handleStart = async () => {
    if (session?.user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_step: 'complete',
            has_completed_tutorial: true 
          })
          .eq('id', session.user.id);
        
        setShowCompletionMessage(false);
        onComplete();
      } catch (error) {
        console.error('Error completing tutorial:', error);
        toast({
          title: "Error completing tutorial",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  const renderTutorialContent = () => {
    if (isProfileLoading || !profile) {
      return null;
    }

    if (showCompletionMessage) {
      return null;
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

              {hasPlayedLine3 && (
                <Button 
                  onClick={handleStart}
                  className="w-full mt-4"
                  size="lg"
                >
                  Let's get started
                </Button>
              )}
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
