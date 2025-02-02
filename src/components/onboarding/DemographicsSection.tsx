import { useState, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TypewriterText } from "@/components/TypewriterText";
import Autocomplete from 'react-google-autocomplete';

interface DemographicsSectionProps {
  session: any;
  onComplete: () => void;
}

export const DemographicsSection = ({ session, onComplete }: DemographicsSectionProps) => {
  const [step, setStep] = useState<'age' | 'city' | 'languages' | 'relationship' | 'gender' | 'occupation'>('age');
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchMapsKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }
        if (!data?.apiKey) {
          console.error('No API key returned:', data);
          throw new Error('No API key returned from function');
        }
        setMapsApiKey(data.apiKey);
      } catch (error: any) {
        console.error('Error fetching Maps API key:', error);
        toast({
          title: "Error loading location selector",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      }
    };

    if (step === 'age') {
      fetchMapsKey();
    }
  }, [step, toast]);

  const handleAgeSubmit = async () => {
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

  const handleCitySubmit = async () => {
    if (!selectedCity) {
      toast({
        title: "Please select a city",
        description: "Select a city from the dropdown",
        variant: "destructive",
      });
      return;
    }

    try {
      await supabase
        .from('profiles')
        .update({ city: selectedCity })
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

  const handleOccupationSubmit = async () => {
    if (!occupation.trim()) {
      toast({
        title: "Please enter your occupation",
        description: "Tell us what you do for work",
        variant: "destructive",
      });
      return;
    }

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
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
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
          <div className="text-lg space-y-4">
            <TypewriterText
              text="Together, we're gonna make sure you spend time doing more of what you already love - and explore new things, too."
              delay={0}
              typingSpeed={25}
            />
            <TypewriterText
              text="How old are you?"
              delay={250}
              typingSpeed={25}
            />
          </div>
          <div className="space-y-4">
            <ChatInput
              onSend={(value) => setAge(value)}
              placeholder="Enter your age..."
              type="number"
              initialValue={age}
              showSendButton={false}
            />
            <Button 
              onClick={handleAgeSubmit}
              className="w-full"
            >
              Continue
            </Button>
          </div>
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
          <div className="space-y-4">
            {mapsApiKey ? (
              <div className="w-full max-w-md">
                <Autocomplete
                  apiKey={mapsApiKey}
                  onPlaceSelected={(place: any) => {
                    console.log('Selected place:', place);
                    if (place && typeof place === 'object') {
                      const address = place.formatted_address || place.name || '';
                      console.log('Using address:', address);
                      if (address) {
                        setSelectedCity(address);
                      }
                    }
                  }}
                  options={{
                    types: ['(cities)'],
                    fields: ['formatted_address']
                  }}
                  className="w-full px-4 py-2 text-gray-700 bg-white border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter your city..."
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading location selector...</div>
            )}
            <Button 
              onClick={handleCitySubmit}
              className="w-full"
              disabled={!selectedCity}
            >
              Continue
            </Button>
          </div>
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
          <div className="space-y-4">
            <ChatInput
              onSend={(value) => setOccupation(value)}
              placeholder="What do you do for work?"
              showSendButton={false}
              initialValue={occupation}
            />
            <Button 
              onClick={handleOccupationSubmit}
              className="w-full"
              disabled={!occupation.trim()}
            >
              Finish
            </Button>
          </div>
        </>
      )}
    </div>
  );
};