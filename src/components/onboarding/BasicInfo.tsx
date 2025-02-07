import { useState, useEffect } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BasicInfoProps {
  session: any;
  onComplete: (name: string, phone?: string) => void;
  initialName?: string;
}

export const BasicInfo = ({ session, onComplete, initialName }: BasicInfoProps) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState(initialName || "");
  const [phone, setPhone] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [completedScreens, setCompletedScreens] = useState<number[]>([]);
  const { toast } = useToast();

  const screens = [
    "Welcome to Alai - your social intelligence.",
    "I'm Al, like Albert - or Alison. I'm here to help you be the best friend you can be.",
    "What's your name?",
  ];

  useEffect(() => {
    // If we're on the name input screen, show the input after a short delay
    if (currentScreen === screens.length - 1) {
      const timer = setTimeout(() => {
        setShowInput(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, screens.length]);

  const handleScreenComplete = (screenIndex: number) => {
    if (!completedScreens.includes(screenIndex)) {
      setCompletedScreens(prev => [...prev, screenIndex]);
      
      if (screenIndex < screens.length - 1) {
        setTimeout(() => {
          setCurrentScreen(screenIndex + 1);
        }, 250);
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Please enter your name",
        description: "We need to know what to call you!",
        variant: "destructive",
      });
      return;
    }

    try {
      const updates = {
        display_name: name,
        ...(phone && { phone_number: phone })
      };

      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session?.user.id);

      onComplete(name, phone);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error saving profile",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleNameSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Please enter your name",
        description: "We need to know what to call you!",
        variant: "destructive",
      });
      return;
    }
    setNameSubmitted(true);
  };

  const handleSkip = () => {
    handleSubmit();
  };

  return (
    <div className="space-y-8">
      {screens.map((text, index) => (
        index <= currentScreen && (
          <div key={index} className="text-lg">
            {completedScreens.includes(index) ? (
              <div>{text}</div>
            ) : (
              <TypewriterText
                text={text}
                onComplete={() => handleScreenComplete(index)}
                delay={250}
                typingSpeed={25}
                className="text-left"
              />
            )}
          </div>
        )
      ))}
      
      <div 
        className={`transition-all duration-500 ${
          showInput ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNameSubmit();
              }
            }}
            disabled={nameSubmitted}
          />
          
          {!nameSubmitted && (
            <Button 
              onClick={handleNameSubmit}
              className="w-full"
            >
              Continue
            </Button>
          )}
        </div>
      </div>

      {nameSubmitted && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TypewriterText
            text="Would you like to add your phone number?"
            onComplete={() => {}}
            delay={250}
            typingSpeed={25}
            className="text-left text-lg"
          />
          <div className="space-y-4">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
            <p className="text-sm text-muted-foreground">
              We will never share your number. Including it will allow you to text Al via SMS.
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={handleSubmit}
                className="flex-1"
                variant="default"
              >
                Continue
              </Button>
              <Button 
                onClick={handleSkip}
                className="flex-1"
                variant="outline"
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};