
import { useState, useCallback } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoalsSectionProps {
  userName?: string;
  onComplete: (selectedGoals: string[]) => void;
  initialGoals?: string[];
}

export const GoalsSection = ({ userName = "", onComplete, initialGoals = [] }: GoalsSectionProps) => {
  const [showGoals, setShowGoals] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialGoals);
  const [introCompleted, setIntroCompleted] = useState(false);

  const goals = [
    "Meet new people",
    "Try new experiences",
    "Catch up with old friends",
    "Find love",
    "Make existing friendships stronger",
    "Improve social skills",
    "Get out more",
  ];

  const handleGoalSelect = (goal: string) => {
    setSelectedGoals(prev => {
      if (prev.includes(goal)) {
        return prev.filter(g => g !== goal);
      }
      return [...prev, goal];
    });
  };

  const handleComplete = useCallback(() => {
    if (selectedGoals.length === 0) return;
    onComplete(selectedGoals);
  }, [selectedGoals, onComplete]);

  return (
    <div className="space-y-8">
      <div className="text-xl font-cormorant">
        {introCompleted ? (
          <div>What are your main goals for the upcoming months, {userName}?</div>
        ) : (
          <TypewriterText
            text={`What are your main goals for the upcoming months${userName ? `, ${userName}` : ''}?`}
            onComplete={() => {
              setIntroCompleted(true);
              setShowGoals(true);
            }}
            delay={250}
            typingSpeed={25}
          />
        )}
      </div>

      <div className={cn(
        "space-y-4 transition-all duration-500",
        showGoals ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <div className="text-xl font-cormorant">Select all that apply:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <Button
              key={goal}
              variant={selectedGoals.includes(goal) ? "default" : "outline"}
              className={cn(
                "justify-start text-left text-xl font-cormorant normal-case",
                selectedGoals.includes(goal) ? "bg-primary" : ""
              )}
              onClick={() => handleGoalSelect(goal)}
            >
              {goal}
            </Button>
          ))}
        </div>

        {selectedGoals.length > 0 && (
          <Button 
            onClick={handleComplete}
            className="w-full mt-4"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
};
