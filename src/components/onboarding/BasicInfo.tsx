import { useState, useEffect } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Autocomplete from 'react-google-autocomplete';

interface BasicInfoProps {
  session: any;
  onComplete: (name: string, phone?: string) => void;
  initialName?: string;
}

export const BasicInfo = ({ session, onComplete, initialName }: BasicInfoProps) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState(initialName || "");
  const [location, setLocation] = useState("");
  const [utcOffset, setUtcOffset] = useState<number>(0);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [locationSubmitted, setLocationSubmitted] = useState(false);
  const [completedScreens, setCompletedScreens] = useState<number[]>([]);
  const { toast } = useToast();

  const screens = [
    "Welcome to Alai - your social intelligence.",
    "I'm Al, like Albert - or Alison.",
    "I'm here to help you be the best friend you can be.",
    "What's your name?",
  ];

  useEffect(() => {
    if (currentScreen === screens.length - 1) {
      const timer = setTimeout(() => {
        setShowInput(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, screens.length]);

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

    if (!location.trim()) {
      toast({
        title: "Please enter your location",
        description: "We need to know where you live!",
        variant: "destructive",
      });
      return;
    }

    try {
      const updates = {
        display_name: name,
        city: location,
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
    fetchMapsKey();
    setNameSubmitted(true);
  };

  const handleLocationSubmit = async () => {
    if (!location) {
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
        .update({ 
          city: location, 
          utc_offset_minutes: utcOffset || 0 
        })
        .eq('id', session?.user.id);

      setLocationSubmitted(true);
    } catch (error) {
      toast({
        title: "Error saving location",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {screens.map((text, index) => (
        index <= currentScreen && (
          <div key={index} className="text-xl font-cormorant">
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
        <div className="space-y-8">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TypewriterText
              text="Where do you live?"
              onComplete={() => {}}
              delay={250}
              typingSpeed={25}
              className="text-left text-xl font-cormorant"
            />
            <div className="space-y-4">
              {mapsApiKey ? (
                <div className="w-full max-w-md">
                  <Autocomplete
                    apiKey={mapsApiKey}
                    onPlaceSelected={(place: any) => {
                      console.log('Selected place:', place);
                      if (place && typeof place === 'object') {
                        const address = place.formatted_address || place.name || '';
                        const offset = parseInt(place.utc_offset_minutes) || 0;
                        console.log('Using address:', address);
                        if (address) {
                          setLocation(address);
                          setUtcOffset(offset);
                        }
                      }
                    }}
                    options={{
                      types: ['(cities)'],
                      fields: ['formatted_address', 'utc_offset_minutes']
                    }}
                    className="w-full px-4 py-2 text-gray-700 bg-white border rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your city..."
                    disabled={locationSubmitted}
                    defaultValue={location}
                  />
                </div>
              ) : (
                <div className="text-xl font-cormorant text-gray-500">Loading location selector...</div>
              )}
              {!locationSubmitted && (
                <Button 
                  onClick={handleLocationSubmit}
                  className="w-full"
                >
                  Continue
                </Button>
              )}
            </div>
          </div>

          {locationSubmitted && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TypewriterText
                text="Would you like to add your phone number? It's completely optional"
                onComplete={() => {}}
                delay={250}
                typingSpeed={25}
                className="text-left text-xl font-cormorant"
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
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
