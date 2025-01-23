import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

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
}

export const PersonalityQuiz = ({ onComplete }: PersonalityQuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [sliderValue, setSliderValue] = useState(50);
  const [comment, setComment] = useState("");
  const [traits, setTraits] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<string[]>([]);
  const { session } = useAuth();
  const { toast } = useToast();

  const handleNext = async () => {
    const question = questions[currentQuestion];
    const updatedTraits = { ...traits, [question.id]: sliderValue };
    const updatedComments = comment ? [...comments, comment] : comments;

    if (currentQuestion < questions.length - 1) {
      setTraits(updatedTraits);
      setComments(updatedComments);
      setCurrentQuestion(prev => prev + 1);
      setSliderValue(50);
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
        <h3 className="text-lg font-medium">{currentQ.text}</h3>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{currentQ.leftLabel}</span>
              <span>{currentQ.rightLabel}</span>
            </div>
            <Slider
              value={[sliderValue]}
              onValueChange={(value) => setSliderValue(value[0])}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          <ChatInput
            onSend={setComment}
            placeholder="say more, if you like..."
          />
        </div>
      </div>
      <Button onClick={handleNext} className="w-full">
        {currentQuestion < questions.length - 1 ? "Next" : "Complete"}
      </Button>
    </div>
  );
};