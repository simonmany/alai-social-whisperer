import { useState, useEffect, useCallback } from "react";
import { TutorialMessage } from "./TutorialMessage";
import { TutorialArrow } from "./TutorialArrow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TypewriterText } from "../TypewriterText";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen: boolean;
}

type ArrowPosition = {
  top: number;
  left: number;
};

export const TutorialOverlay = ({ onComplete, isProfileOpen }: TutorialOverlayProps) => {
  const [step, setStep] = useState<'splash' | 'profile' | 'goals' | 'complete'>('splash');
  const [splashMessagePlayed, setSplashMessagePlayed] = useState(false);
  const [profileMessagePlayed, setProfileMessagePlayed] = useState(false);
  const [goalsMessagePlayed, setGoalsMessagePlayed] = useState(false);
  const [profileArrowPosition, setProfileArrowPosition] = useState<ArrowPosition | null>(null);
  const [goalsArrowPositions, setGoalArrowPositions] = useState<ArrowPosition[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for splash screen message sequence
  const [hasPlayedGreeting, setHasPlayedGreeting] = useState(false);
  const [showJourneyMessage, setShowJourneyMessage] = useState(false);
  const [hasPlayedJourneyMessage, setHasPlayedJourneyMessage] = useState(false);
  const [showFinalPrompt, setShowFinalPrompt] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('goals, onboarding_step')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    }
  });

  const updateProfileArrowPosition = useCallback(() => {
    const button = document.querySelector('[data-testid="profile-button"]');
    if (button) {
      const rect = button.getBoundingClientRect();
      setProfileArrowPosition({
        top: rect.top + rect.height / 2,
        left: rect.left - 40  // Position arrow to the left of the button
      });
    }
  }, []);

  const updateGoalArrowPositions = useCallback(() => {
    const buttons = document.querySelectorAll('[data-testid="goal-button"]');
    const positions = Array.from(buttons).map(button => {
      const rect = button.getBoundingClientRect();
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - 40  // Position arrow to the left of the button
      };
    });
    setGoalArrowPositions(positions);
  }, []);

  useEffect(() => {
    if (step === 'profile') {
      updateProfileArrowPosition();
    }
  }, [step, updateProfileArrowPosition]);

  useEffect(() => {
    const handleResize = () => {
      if (step === 'profile') {
        updateProfileArrowPosition();
      } else if (step === 'goals' && isProfileOpen) {
        updateGoalArrowPositions();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [step, isProfileOpen, updateProfileArrowPosition, updateGoalArrowPositions]);

  useEffect(() => {
    if (step === 'goals' && isProfileOpen) {
      updateGoalArrowPositions();
    }
  }, [step, isProfileOpen, updateGoalArrowPositions]);

  const handleSplashComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_step: 'profile'
        })
        .eq('id', user.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setStep('profile');
    } catch (error: any) {
      console.error('Error updating onboarding step:', error);
      toast({
        title: "Error updating progress",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (step === 'splash') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl w-full mx-4 space-y-8 text-left font-cormorant">
          <TypewriterText 
            text="Hi, Simon. It's nice to meet you."
            className="text-4xl font-medium"
            delay={500}
            onComplete={() => {
              if (!hasPlayedGreeting) {
                setHasPlayedGreeting(true);
                setTimeout(() => setShowJourneyMessage(true), 500);
              }
            }}
          />
          
          {showJourneyMessage && (
            <div className="space-y-8">
              <TypewriterText 
                text="I'm excited for our journey together."
                className="text-2xl"
                delay={0}
                onComplete={() => {
                  if (!hasPlayedJourneyMessage) {
                    setHasPlayedJourneyMessage(true);
                    setTimeout(() => setShowFinalPrompt(true), 500);
                  }
                }}
              />
              
              {showFinalPrompt && (
                <div className="space-y-4">
                  <p className="text-2xl">Ready to get started?</p>
                  <button
                    onClick={handleSplashComplete}
                    className="pointer-events-auto w-full bg-primary text-primary-foreground p-4 rounded-lg hover:bg-primary/90 transition-colors text-xl animate-fade-in"
                  >
                    Let's go!
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {step === 'profile' && profileArrowPosition && (
        <>
          <TutorialMessage
            className="absolute top-24 left-1/2 -translate-x-1/2"
            style={{ maxWidth: '90vw' }}
          >
            Click on your profile to set some goals and tell me about yourself!
          </TutorialMessage>
          <TutorialArrow
            direction="right"
            style={{
              position: 'fixed',
              top: profileArrowPosition.top,
              left: profileArrowPosition.left,
            }}
          />
        </>
      )}

      {step === 'goals' && isProfileOpen && (
        <>
          <TutorialMessage
            className="absolute top-24 left-1/2 -translate-x-1/2"
            style={{ maxWidth: '90vw' }}
          >
            Set a goal to get started!
          </TutorialMessage>
          {goalsArrowPositions.map((position, index) => (
            <TutorialArrow
              key={index}
              direction="right"
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 9999
              }}
            />
          ))}
        </>
      )}

      {step === 'complete' && (
        <TutorialMessage
          className="absolute top-24 left-1/2 -translate-x-1/2"
          style={{ maxWidth: '90vw' }}
        >
          <div className="space-y-4">
            <p>That's it! You're all set to start using the app.</p>
            <button
              onClick={onComplete}
              className="pointer-events-auto bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Start Using App
            </button>
          </div>
        </TutorialMessage>
      )}
    </div>
  );
};