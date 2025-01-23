import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  content: string;
  isAl: boolean;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const { session } = useAuth();
  const { toast } = useToast();

  const goals = [
    "Stay in touch and reconnect",
    "Make new friends",
    "Try new activities",
    "Go on dates and find love",
    "Network professionally"
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setMessages([{ content: "Welcome to Alai - your social intelligence.", isAl: true }]);
    }, 500);

    const timer2 = setTimeout(() => {
      setMessages(prev => [...prev, { 
        content: "I'm Al, like Albert - or Alison. I'm here to help you be the best friend you can be.",
        isAl: true 
      }]);
    }, 2000);

    const timer3 = setTimeout(() => {
      setMessages(prev => [...prev, {
        content: "First, let's get to know each other a bit better! What's your name?",
        isAl: true
      }]);
      setShowInput(true);
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleNameSubmit = async (name: string) => {
    setMessages(prev => [...prev, { content: name, isAl: false }]);
    setShowInput(false);

    try {
      await supabase
        .from('profiles')
        .update({ display_name: name })
        .eq('id', session?.user.id);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: `Nice to meet you, ${name}!`,
          isAl: true
        }]);
      }, 500);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "Next, let's talk about your goals. Which of these are you interested in? You can choose multiple.",
          isAl: true
        }]);
        setShowGoals(true);
      }, 1500);
    } catch (error) {
      toast({
        title: "Error saving name",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

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
        .update({ 
          goals: selectedGoals,
          onboarding_completed: true 
        })
        .eq('id', session?.user.id);

      setShowGoals(false);
      
      const goalsList = selectedGoals.join(", ");
      setMessages(prev => [...prev, {
        content: `I can definitely help you ${goalsList.toLowerCase()}! Let's get started.`,
        isAl: true
      }]);

      setTimeout(onComplete, 2000);
    } catch (error) {
      toast({
        title: "Error saving goals",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            content={message.content}
            isAl={message.isAl}
            animate={index === messages.length - 1}
          />
        ))}
      </div>
      
      {showInput && (
        <ChatInput
          onSend={handleNameSubmit}
          placeholder="Enter your name..."
        />
      )}

      {showGoals && (
        <div className="space-y-4">
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
      )}
    </div>
  );
};