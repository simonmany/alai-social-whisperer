import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { TypewriterText } from "@/components/TypewriterText";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  text: string;
  leftLabel: string;
  rightLabel: string;
}

const questions: Question[] = [
  {
    id: 1,
    text: "Do you consider yourself an introvert or an extrovert?",
    leftLabel: "introvert",
    rightLabel: "extrovert",
  },
  {
    id: 2,
    text: "Are you typically quiet or talkative in social settings?",
    leftLabel: "Quality over quantity",
    rightLabel: "adept conversationalist",
  },
  {
    id: 3,
    text: "Do you prefer to hang out with people one on one or in groups?",
    leftLabel: "Love a duet",
    rightLabel: "love an orchestra",
  },
  {
    id: 4,
    text: "Do you prefer to plan ahead or be spontaneous?",
    leftLabel: "I live by my calendar",
    rightLabel: "What's a calendar?",
  },
];

interface PersonalityQuizProps {
  onComplete: (traits: Record<string, number>, comments: string[]) => void;
  initialTraits?: Record<string, number>;
  initialComments?: string[];
}

export const PersonalityQuiz = ({ onComplete, initialTraits, initialComments }: PersonalityQuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedValue, setSelectedValue] = useState<number | null>(
    initialTraits ? initialTraits[questions[currentQuestion].id] : null
  );
  const [comment, setComment] = useState("");
  const [traits, setTraits] = useState<Record<string, number>>(initialTraits || {});
  const [comments, setComments] = useState<string[]>(initialComments || []);
  const [showInitialContent, setShowInitialContent] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const handleNext = async () => {
    if (selectedValue === null) {
      toast({
        title: "Please select an option",
        description: "Choose where you fall on the spectrum",
        variant: "destructive",
      });
      return;
    }

    const question = questions[currentQuestion];
    const updatedTraits = { ...traits, [question.id]: selectedValue };
    const updatedComments = comment ? [...comments, comment] : comments;

    if (currentQuestion < questions.length - 1) {
      setTraits(updatedTraits);
      setComments(updatedComments);
      setCurrentQuestion(prev => prev + 1);
      setSelectedValue(updatedTraits[questions[currentQuestion + 1].id] || null);
      setComment("");
    } else {
      try {
        await supabase
          .from('profiles')
          .update({
            personality_traits: updatedTraits,
            personality_comments: updatedComments,
          })
          .eq('id', session?.user.id);

        onComplete(updatedTraits, updatedComments);
      } catch (error) {
        toast({
          title: "Error saving personality data",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  const getButtonStyle = (value: number) => {
    const isSelected = selectedValue === value;
    const gradientColors = {
      20: "#ea384c",
      40: "#FEC6A1",
      60: "#7E69AB",
      80: "#33C3F0",
      100: "#0EA5E9",
    };
    
    return {
      background: gradientColors[value as keyof typeof gradientColors],
      opacity: isSelected ? 1 : 0.7,
      transform: isSelected ? "scale(1.05)" : "scale(1)",
      transition: "all 0.2s ease-in-out",
    };
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="h-1 w-full bg-gray-200 rounded">
          <div
            className="h-1 bg-primary rounded transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <TypewriterText 
          text={currentQ.text} 
          onComplete={() => setShowInitialContent(true)}
          delay={250}
          typingSpeed={25}
        />
        <div className={cn(
          "space-y-6",
          currentQuestion === 0 && !showInitialContent ? "opacity-0 pointer-events-none" : "opacity-100",
          currentQuestion === 0 ? "transition-opacity duration-500" : ""
        )}>
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{currentQ.leftLabel}</span>
              <span>{currentQ.rightLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              {[20, 40, 60, 80, 100].map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  className="flex-1 h-12 transition-all"
                  style={getButtonStyle(value)}
                  onClick={() => setSelectedValue(value)}
                >
                  {value / 20}
                </Button>
              ))}
            </div>
          </div>
          <ChatInput
            onSend={(newComment) => {
              setComment(newComment);
            }}
            placeholder="say more, if you like..."
            initialValue={comment}
            showSendButton={false}
          />
        </div>
      </div>

      <div className={cn(
        currentQuestion === 0 && !showInitialContent ? "opacity-0 pointer-events-none" : "opacity-100",
        currentQuestion === 0 ? "transition-opacity duration-500" : ""
      )}>
        <Button onClick={handleNext} className="w-full">
          {currentQuestion < questions.length - 1 ? "Next" : "Complete"}
        </Button>
      </div>
    </div>
  );
};