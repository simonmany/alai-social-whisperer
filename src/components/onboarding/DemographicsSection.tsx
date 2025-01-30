import { useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TypewriterText } from "@/components/TypewriterText";

interface DemographicsSectionProps {
  session: any;
  onComplete: () => void;
}

export const DemographicsSection = ({ session, onComplete }: DemographicsSectionProps) => {
  const [step, setStep] = useState<'age' | 'city' | 'languages' | 'relationship' | 'gender' | 'occupation'>('age');
  const { toast } = useToast();

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

    try {
      await supabase
        .from('profiles')
        .update({ age: ageNum })
        .eq('id', session?.user.id);

      setStep('city');
    } catch (error) {
      toast({
        title: "Error saving age",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCitySubmit = async (city: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ city })
        .eq('id', session?.user.id);

      setStep('languages');
    } catch (error) {
      toast({
        title: "Error saving city",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleLanguagesComplete = async (languages: string[]) => {
    try {
      await supabase
        .from('profiles')
        .update({ languages })
        .eq('id', session?.user.id);

      setStep('relationship');
    } catch (error) {
      toast({
        title: "Error saving languages",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRelationshipSubmit = async (status: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ relationship_status: status })
        .eq('id', session?.user.id);

      setStep('gender');
    } catch (error) {
      toast({
        title: "Error saving relationship status",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleGenderSubmit = async (gender: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ gender })
        .eq('id', session?.user.id);

      setStep('occupation');
    } catch (error) {
      toast({
        title: "Error saving gender",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleOccupationSubmit = async (occupation: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          occupation,
          onboarding_completed: true,
          onboarding_started_at: new Date().toISOString()
        })
        .eq('id', session?.user.id);

      onComplete();
    } catch (error) {
      toast({
        title: "Error completing onboarding",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {step === 'age' && (
        <>
          <div className="text-lg">
            <TypewriterText
              text="How old are you?"
              delay={250}
              typingSpeed={25}
            />
          </div>
          <ChatInput
            onSend={handleAgeSubmit}
            placeholder="Enter your age..."
            type="number"
          />
        </>
      )}

      {step === 'city' && (
        <>
          <div className="text-lg">
            <TypewriterText
              text="Where do you live?"
              delay={250}
              typingSpeed={25}
            />
          </div>
          <ChatInput
            onSend={handleCitySubmit}
            placeholder="Enter your city..."
          />
        </>
      )}

      {step === 'languages' && (
        <>
          <div className="text-lg">
            <TypewriterText
              text="What languages do you speak?"
              delay={250}
              typingSpeed={25}
            />
          </div>
          <LanguageSelector onComplete={handleLanguagesComplete} />
        </>
      )}

      {step === 'relationship' && (
        <>
          <div className="text-lg">
            <TypewriterText
              text="What's your relationship status?"
              delay={250}
              typingSpeed={25}
            />
          </div>
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
        </>
      )}

      {step === 'gender' && (
        <>
          <div className="text-lg">
            <TypewriterText
              text="What's your gender?"
              delay={250}
              typingSpeed={25}
            />
          </div>
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
        </>
      )}

      {step === 'occupation' && (
        <>
          <div className="text-lg">
            <TypewriterText
              text="What do you do for work?"
              delay={250}
              typingSpeed={25}
            />
          </div>
          <ChatInput
            onSend={handleOccupationSubmit}
            placeholder="What do you do for work?"
          />
        </>
      )}
    </div>
  );
};