
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/ChatMessage";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GoalsSectionProps {
  onComplete: (goals: string[]) => void;
  initialGoals?: string[];
  userName?: string;
}

export const GoalsSection = ({ onComplete, initialGoals, userName }: GoalsSectionProps) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialGoals || []);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [showGoalsText, setShowGoalsText] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { toast } = useToast();

  const goals = [
    "Stay in touch and reconnect",
    "Make new friends",
    "Try new activities",
    "Go on dates and find love",
    "Network professionally"
  ];

  const capitalizedName = userName 
    ? userName.charAt(0).toUpperCase() + userName.slice(1) 
    : '';

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleGoalsSubmit = async () => {
    if (selectedGoals.length === 0) {
      toast({
        title: "Please select at least one goal",
        description: "This will help me assist you better",
        variant: "destructive",
      });
      return;
    }

    onComplete(selectedGoals);
  };

  return (
    <div className="space-y-4">
      {userName && (
        <div className="text-xl font-cormorant mb-6">
          {introCompleted ? (
            <div>{`Nice to meet you, ${capitalizedName}!`}</div>
          ) : (
            <TypewriterText
              text={`Nice to meet you, ${capitalizedName}!`}
              delay={0}
              typingSpeed={25}
              onComplete={() => {
                setIntroCompleted(true);
                setShowGoalsText(true);
              }}
            />
          )}
        </div>
      )}
      
      <div className="text-xl font-cormorant">
        {showOptions ? (
          <div>Next, let's talk about your goals. Which of these are you interested in? You can choose multiple.</div>
        ) : showGoalsText && (
          <TypewriterText
            text="Next, let's talk about your goals. Which of these are you interested in? You can choose multiple."
            delay={250}
            typingSpeed={25}
            onComplete={() => setShowOptions(true)}
          />
        )}
      </div>
      
      <div className={cn(
        "flex flex-wrap gap-2 transition-opacity duration-500",
        showOptions ? "opacity-100" : "opacity-0"
      )}>
        {goals.map((goal) => (
          <Button
            key={goal}
            variant={selectedGoals.includes(goal) ? "default" : "outline"}
            onClick={() => handleGoalToggle(goal)}
            className="transition-colors text-xl font-cormorant"
          >
            {goal}
          </Button>
        ))}
      </div>
      
      <Button 
        onClick={handleGoalsSubmit}
        className={cn(
          "w-full transition-opacity duration-500",
          showOptions ? "opacity-100" : "opacity-0"
        )}
      >
        Continue
      </Button>
    </div>
  );
};
