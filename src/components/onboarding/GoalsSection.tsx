import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/ChatMessage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoalsSectionProps {
  session: any;
  onComplete: () => void;
}

export const GoalsSection = ({ session, onComplete }: GoalsSectionProps) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const { toast } = useToast();

  const goals = [
    "Stay in touch and reconnect",
    "Make new friends",
    "Try new activities",
    "Go on dates and find love",
    "Network professionally"
  ];

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

    try {
      await supabase
        .from('profiles')
        .update({ goals: selectedGoals })
        .eq('id', session?.user.id);

      onComplete();
    } catch (error) {
      toast({
        title: "Error saving goals",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <ChatMessage
        content="Next, let's talk about your goals. Which of these are you interested in? You can choose multiple."
        isAl={true}
        animate={true}
      />
      
      <div className="flex flex-wrap gap-2">
        {goals.map((goal) => (
          <Button
            key={goal}
            variant={selectedGoals.includes(goal) ? "default" : "outline"}
            onClick={() => handleGoalToggle(goal)}
            className="transition-colors"
          >
            {goal}
          </Button>
        ))}
      </div>
      
      <Button 
        onClick={handleGoalsSubmit}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
};