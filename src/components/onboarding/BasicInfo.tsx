import { useState, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BasicInfoProps {
  session: any;
  onComplete: (name: string) => void;
  initialName?: string;
}

export const BasicInfo = ({ session, onComplete, initialName }: BasicInfoProps) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const { toast } = useToast();

  const screens = [
    "Welcome to Alai - your social intelligence.",
    "I'm Al, like Albert - or Alison. I'm here to help you be the best friend you can be.",
    "First, let's get to know each other a bit better! What's your name?"
  ];

  const handleScreenComplete = (screenIndex: number) => {
    if (screenIndex < screens.length - 1) {
      setTimeout(() => {
        setCurrentScreen(screenIndex + 1);
      }, 250); // Match the delay with TypewriterText
    } else {
      setShowInput(true);
    }
  };

  const handleNameSubmit = async (name: string) => {
    setShowInput(false);

    try {
      await supabase
        .from('profiles')
        .update({ display_name: name })
        .eq('id', session?.user.id);

      onComplete(name);
    } catch (error) {
      toast({
        title: "Error saving name",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {screens.map((text, index) => (
        index <= currentScreen && (
          <div key={index} className="text-lg">
            <TypewriterText
              text={text}
              onComplete={() => handleScreenComplete(index)}
              delay={250}
              typingSpeed={25}
              className="text-left"
            />
          </div>
        )
      ))}
      
      {showInput && (
        <ChatInput
          onSend={handleNameSubmit}
          placeholder="Enter your name..."
          initialValue={initialName}
        />
      )}
    </div>
  );
};