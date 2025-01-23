import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { PersonalityQuiz } from "@/components/PersonalityQuiz";
import { InterestSelector } from "@/components/InterestSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
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
  const [showPersonalityQuiz, setShowPersonalityQuiz] = useState(false);
  const [showCurrentInterests, setShowCurrentInterests] = useState(false);
  const [showDesiredInterests, setShowDesiredInterests] = useState(false);
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
        .update({ goals: selectedGoals })
        .eq('id', session?.user.id);

      setShowGoals(false);
      
      const goalsList = selectedGoals.join(", ");
      setMessages(prev => [...prev, {
        content: `Great choices! I can definitely help you ${goalsList.toLowerCase()}!`,
        isAl: true
      }]);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "Now, I'd like to understand your personality better. Let's do a quick quiz!",
          isAl: true
        }]);
        setShowPersonalityQuiz(true);
      }, 1500);
    } catch (error) {
      toast({
        title: "Error saving goals",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePersonalityComplete = async (traits: Record<string, number>, comments: string[]) => {
    setShowPersonalityQuiz(false);
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          personality_traits: traits,
          personality_comments: comments 
        })
        .eq('id', session?.user.id);

      setMessages(prev => [...prev, {
        content: "Thanks for sharing! Now, let's talk about interests. What do you like to do for fun?",
        isAl: true
      }]);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "Enter at least 3 activities.",
          isAl: true
        }]);
        setShowCurrentInterests(true);
      }, 1000);

    } catch (error) {
      toast({
        title: "Error saving personality data",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCurrentInterestsComplete = async (interests: string[]) => {
    setShowCurrentInterests(false);
    
    try {
      await supabase
        .from('profiles')
        .update({ current_interests: interests })
        .eq('id', session?.user.id);

      setMessages(prev => [...prev, {
        content: `That's a cool set of hobbies! Now, what is something you'd like to get into that you haven't done yet?`,
        isAl: true
      }]);
      
      setShowDesiredInterests(true);

    } catch (error) {
      toast({
        title: "Error saving interests",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDesiredInterestsComplete = async (interests: string[]) => {
    setShowDesiredInterests(false);
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          desired_interests: interests,
          onboarding_completed: true 
        })
        .eq('id', session?.user.id);

      setMessages(prev => [...prev, {
        content: "Now for some details.",
        isAl: true
      }]);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "How old are you?",
          isAl: true
        }]);
        setShowAge(true);
      }, 1000);

    } catch (error) {
      toast({
        title: "Error saving interests",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleAgeSubmit = async (age: string) => {
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      toast({
        title: "Invalid age",
        description: "Please enter a valid age between 13 and 120",
        variant: "destructive",
      });
      return;
    }

    setMessages(prev => [...prev, { content: age, isAl: false }]);
    setShowAge(false);

    try {
      await supabase
        .from('profiles')
        .update({ age: ageNum })
        .eq('id', session?.user.id);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "Where do you live?",
          isAl: true
        }]);
        setShowCity(true);
      }, 500);
    } catch (error) {
      toast({
        title: "Error saving age",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCitySubmit = async (city: string) => {
    setMessages(prev => [...prev, { content: city, isAl: false }]);
    setShowCity(false);

    try {
      await supabase
        .from('profiles')
        .update({ city })
        .eq('id', session?.user.id);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "What languages do you speak?",
          isAl: true
        }]);
        setShowLanguages(true);
      }, 500);
    } catch (error) {
      toast({
        title: "Error saving city",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleLanguagesComplete = async (languages: string[]) => {
    setMessages(prev => [...prev, { 
      content: languages.join(", "), 
      isAl: false 
    }]);
    setShowLanguages(false);

    try {
      await supabase
        .from('profiles')
        .update({ languages })
        .eq('id', session?.user.id);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "What's your relationship status?",
          isAl: true
        }]);
        setShowRelationship(true);
      }, 500);
    } catch (error) {
      toast({
        title: "Error saving languages",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRelationshipSubmit = async (status: string) => {
    setMessages(prev => [...prev, { content: status, isAl: false }]);
    setShowRelationship(false);

    try {
      await supabase
        .from('profiles')
        .update({ relationship_status: status })
        .eq('id', session?.user.id);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "What's your gender?",
          isAl: true
        }]);
        setShowGender(true);
      }, 500);
    } catch (error) {
      toast({
        title: "Error saving relationship status",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleGenderSubmit = async (gender: string) => {
    setMessages(prev => [...prev, { content: gender, isAl: false }]);
    setShowGender(false);

    try {
      await supabase
        .from('profiles')
        .update({ gender })
        .eq('id', session?.user.id);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          content: "What do you do for work?",
          isAl: true
        }]);
        setShowOccupation(true);
      }, 500);
    } catch (error) {
      toast({
        title: "Error saving gender",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleOccupationSubmit = async (occupation: string) => {
    setMessages(prev => [...prev, { content: occupation, isAl: false }]);
    setShowOccupation(false);

    try {
      await supabase
        .from('profiles')
        .update({ 
          occupation,
          onboarding_completed: true 
        })
        .eq('id', session?.user.id);

      setMessages(prev => [...prev, {
        content: "Thanks for sharing! I'll keep all of this in mind to help you achieve your social goals.",
        isAl: true
      }]);

      setTimeout(onComplete, 2000);

    } catch (error) {
      toast({
        title: "Error completing onboarding",
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

      {showPersonalityQuiz && (
        <PersonalityQuiz onComplete={handlePersonalityComplete} />
      )}

      {showCurrentInterests && (
        <InterestSelector
          onComplete={handleCurrentInterestsComplete}
          placeholder="Type to search activities..."
          minSelections={3}
        />
      )}

      {showDesiredInterests && (
        <InterestSelector
          onComplete={handleDesiredInterestsComplete}
          placeholder="Type to search new activities..."
          minSelections={1}
        />
      )}

      {showAge && (
        <ChatInput
          onSend={handleAgeSubmit}
          placeholder="Enter your age..."
          type="number"
        />
      )}

      {showCity && (
        <ChatInput
          onSend={handleCitySubmit}
          placeholder="Enter your city..."
        />
      )}

      {showLanguages && (
        <LanguageSelector onComplete={handleLanguagesComplete} />
      )}

      {showRelationship && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Single", "Cuffed", "It's complicated"].map((status) => (
              <Button
                key={status}
                variant="outline"
                onClick={() => handleRelationshipSubmit(status)}
                className="transition-colors"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showGender && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Male", "Female", "Non-Binary"].map((gender) => (
              <Button
                key={gender}
                variant="outline"
                onClick={() => handleGenderSubmit(gender)}
                className="transition-colors"
              >
                {gender}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showOccupation && (
        <ChatInput
          onSend={handleOccupationSubmit}
          placeholder="What do you do for work?"
        />
      )}
    </div>
  );
};
