import { useState, useEffect } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BasicInfoProps {
  session: any;
  onComplete: (name: string) => void;
  initialName?: string;
}

export const BasicInfo = ({ session, onComplete, initialName }: BasicInfoProps) => {
  const [name, setName] = useState(initialName || "");
  const { toast } = useToast();

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
      await supabase
        .from('profiles')
        .update({ display_name: name })
        .eq('id', session?.user.id);

      onComplete(name);
    } catch (error: any) {
      console.error('Error updating name:', error);
      toast({
        title: "Error saving name",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-lg">
        <TypewriterText
          text="Hi! I'm Al, your social intelligence assistant. What's your name?"
          delay={0}
        />
      </div>
      
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        
        <Button 
          onClick={handleSubmit}
          className="w-full"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};