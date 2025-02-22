
import { TypewriterText } from "@/components/TypewriterText";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PersonalityIntroProps {
  userName?: string;
  onStart: () => void;
}

export const PersonalityIntro = ({ userName = "there", onStart }: PersonalityIntroProps) => {
  const [showButton, setShowButton] = useState(false);
  const [showSecondText, setShowSecondText] = useState(false);
  const [firstTextCompleted, setFirstTextCompleted] = useState(false);
  const [secondTextCompleted, setSecondTextCompleted] = useState(false);

  return (
    <div className="space-y-4">
      <div className="text-xl font-cormorant">
        {firstTextCompleted ? (
          <div>Nice! I'm looking forward to helping you achieve your goals.</div>
        ) : (
          <TypewriterText
            text="Nice! I'm looking forward to helping you achieve your goals."
            delay={0}
            onComplete={() => {
              setFirstTextCompleted(true);
              setShowSecondText(true);
            }}
          />
        )}
      </div>
      <div className="text-xl font-cormorant">
        {secondTextCompleted ? (
          <div>To help me get to know you better, I've got a few quick questions for you. This shouldn't take more than a minute:</div>
        ) : showSecondText && (
          <TypewriterText
            text="To help me get to know you better, I've got a few quick questions for you. This shouldn't take more than a minute:"
            delay={250}
            onComplete={() => {
              setSecondTextCompleted(true);
              setShowButton(true);
            }}
          />
        )}
      </div>
      <div className={cn(
        "transition-opacity duration-500",
        showButton ? "opacity-100" : "opacity-0"
      )}>
        <Button onClick={onStart} className="w-full text-lg">
          Start Quiz
        </Button>
      </div>
    </div>
  );
};
