import { useState, useEffect, useCallback } from "react";
import { TutorialMessage } from "./TutorialMessage";
import { TutorialArrow } from "./TutorialArrow";
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
  const [profileArrowPosition, setProfileArrowPosition] = useState<ArrowPosition | null>(null);
  const [goalsArrowPositions, setGoalArrowPositions] = useState<ArrowPosition[]>([]);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [completedScreens, setCompletedScreens] = useState<number[]>([]);
  const [showFinalPrompt, setShowFinalPrompt] = useState(false);

  const screens = [
    "Hi, Simon. It's nice to meet you.",
    "I'm excited for our journey together."
  ];

  const updateProfileArrowPosition = useCallback(() => {
    const button = document.querySelector('[data-testid="profile-button"]');
    if (button) {
      const rect = button.getBoundingClientRect();
      setProfileArrowPosition({
        top: rect.top + rect.height / 2,
        left: rect.left - 40
      });
    }
  }, []);

  const updateGoalArrowPositions = useCallback(() => {
    const buttons = document.querySelectorAll('[data-testid="goal-button"]');
    const positions = Array.from(buttons).map(button => {
      const rect = button.getBoundingClientRect();
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - 40
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

  const handleScreenComplete = (screenIndex: number) => {
    if (!completedScreens.includes(screenIndex)) {
      setCompletedScreens(prev => [...prev, screenIndex]);
      
      if (screenIndex < screens.length - 1) {
        setTimeout(() => {
          setCurrentScreen(screenIndex + 1);
        }, 250);
      } else {
        setShowFinalPrompt(true);
      }
    }
  };

  if (step === 'splash') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl w-full mx-4 space-y-8 text-left font-cormorant">
          {screens.map((text, index) => (
            index <= currentScreen && (
              <div key={index} className="text-lg">
                {completedScreens.includes(index) ? (
                  <div>{text}</div>
                ) : (
                  <TypewriterText
                    text={text}
                    onComplete={() => handleScreenComplete(index)}
                    delay={250}
                    typingSpeed={25}
                    className="text-left"
                  />
                )}
              </div>
            )
          ))}
          
          {showFinalPrompt && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-2xl">Ready to get started?</p>
              <button
                onClick={() => setStep('profile')}
                className="pointer-events-auto w-full bg-primary text-primary-foreground p-4 rounded-lg hover:bg-primary/90 transition-colors text-xl"
              >
                Let's go!
              </button>
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