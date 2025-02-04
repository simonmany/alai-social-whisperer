import { useState, useEffect, useCallback } from "react";
import { TutorialMessage } from "./TutorialMessage";
import { TutorialArrow } from "./TutorialArrow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

  const updateOnboardingStep = async (newStep: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: newStep })
        .eq('id', user.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      console.error('Error updating onboarding step:', error);
      toast({
        title: "Error updating progress",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          has_completed_tutorial: true,
          onboarding_step: 'complete'
        })
        .eq('id', user.id);

      if (error) throw error;
      
      onComplete();
    } catch (error: any) {
      console.error('Error completing tutorial:', error);
      toast({
        title: "Error completing tutorial",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

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
    if (profile?.onboarding_step) {
      setStep(profile.onboarding_step as any);
    }
  }, [profile?.onboarding_step]);

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
    if (step === 'profile') {
      updateProfileArrowPosition();
    }
  }, [step, updateProfileArrowPosition]);

  useEffect(() => {
    if (step === 'goals' && isProfileOpen) {
      updateGoalArrowPositions();
    }
  }, [step, isProfileOpen, updateGoalArrowPositions]);

  // Check if user has set any goals
  useEffect(() => {
    if (step === 'goals' && profile?.goals && profile.goals.length > 0) {
      handleComplete();
    }
  }, [step, profile?.goals]);

  const handleSplashComplete = () => {
    setSplashMessagePlayed(true);
    updateOnboardingStep('profile');
    setStep('profile');
  };

  const handleProfileMessageComplete = () => {
    setProfileMessagePlayed(true);
  };

  const handleGoalsMessageComplete = () => {
    setGoalsMessagePlayed(true);
  };

  if (step === 'splash') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <TutorialMessage
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="space-y-4">
            <p>Hi! I'm Al, your social life assistant.</p>
            <p>Let me show you around!</p>
            <button
              onClick={handleSplashComplete}
              className="pointer-events-auto bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
          </div>
        </TutorialMessage>
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
    </div>
  );
};