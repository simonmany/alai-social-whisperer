import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { TypewriterText } from "@/components/TypewriterText";
import { cn } from "@/lib/utils";

interface PersonalityQuestionProps {
  question: {
    id: number;
    text: string;
    leftLabel: string;
    rightLabel: string;
  };
  initialValue?: number;
  aiResponse?: string;
  isLoadingAi?: boolean;
  onAnswer: (value: number, comment: string) => void;
}

export const PersonalityQuestion = ({
  question,
  initialValue,
  aiResponse,
  isLoadingAi,
  onAnswer
}: PersonalityQuestionProps) => {
  const [selectedValue, setSelectedValue] = useState<number | null>(initialValue || null);
  const [currentComment, setCurrentComment] = useState("");
  const [showContent, setShowContent] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const handleNext = () => {
    if (selectedValue !== null) {
      // Simulate Enter keypress to submit any pending comment
      if (chatInputRef.current) {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        chatInputRef.current.dispatchEvent(enterEvent);
      }
      
      // Submit the answer with current values
      onAnswer(selectedValue, currentComment);
      setCurrentComment(""); // Clear comment after submitting
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

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {aiResponse && (
          <div className="bg-primary/10 p-4 rounded-lg mb-4">
            <TypewriterText text={aiResponse} delay={0} />
          </div>
        )}
        {isLoadingAi ? (
          <div className="text-sm text-gray-500 animate-pulse">
            Analyzing your response...
          </div>
        ) : (
          <TypewriterText 
            text={question.text} 
            onComplete={() => setShowContent(true)}
            delay={250}
            typingSpeed={25}
          />
        )}
        <div className={cn(
          "space-y-6",
          !showContent ? "opacity-0 pointer-events-none" : "opacity-100",
          "transition-opacity duration-500"
        )}>
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{question.leftLabel}</span>
              <span>{question.rightLabel}</span>
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
            ref={chatInputRef}
            onSend={(newComment) => {
              setCurrentComment(newComment);
            }}
            placeholder="say more, if you like..."
            initialValue={currentComment}
            showSendButton={false}
            type="text"
          />
          {selectedValue && (
            <Button 
              onClick={handleNext}
              className="w-full"
              disabled={isLoadingAi}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};