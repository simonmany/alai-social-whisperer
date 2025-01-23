import { useState, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BasicInfoProps {
  session: any;
  onComplete: (name: string) => void;
}

export const BasicInfo = ({ session, onComplete }: BasicInfoProps) => {
  const [messages, setMessages] = useState<Array<{ content: string; isAl: boolean }>>([]);
  const [showInput, setShowInput] = useState(false);
  const { toast } = useToast();

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
    <div className="space-y-4">
      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          content={message.content}
          isAl={message.isAl}
          animate={index === messages.length - 1}
        />
      ))}
      
      {showInput && (
        <ChatInput
          onSend={handleNameSubmit}
          placeholder="Enter your name..."
        />
      )}
    </div>
  );
};