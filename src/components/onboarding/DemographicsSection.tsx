
import { useState } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DemographicsSectionProps {
  session: any;
  onComplete: () => void;
}

export const DemographicsSection = ({ session, onComplete }: DemographicsSectionProps) => {
  const [showForm, setShowForm] = useState(false);
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [introCompleted, setIntroCompleted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age_range: age,
          gender,
          location,
        })
        .eq('id', session?.user?.id);

      if (error) throw error;
      onComplete();
    } catch (error: any) {
      console.error('Error updating demographics:', error);
      toast({
        title: "Error saving demographics",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="space-y-8">
      <div className="text-xl font-cormorant">
        {introCompleted ? (
          <div>Finally, just a few optional details about you to help me make better suggestions:</div>
        ) : (
          <TypewriterText
            text="Finally, just a few optional details about you to help me make better suggestions:"
            onComplete={() => {
              setIntroCompleted(true);
              setShowForm(true);
            }}
            delay={250}
            typingSpeed={25}
          />
        )}
      </div>

      <div className={`space-y-6 transition-all duration-500 ${showForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="space-y-4">
          <label className="block text-xl font-cormorant">Age Range</label>
          <Select value={age} onValueChange={setAge}>
            <SelectTrigger>
              <SelectValue placeholder="Select your age range" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="18-24">18-24</SelectItem>
                <SelectItem value="25-34">25-34</SelectItem>
                <SelectItem value="35-44">35-44</SelectItem>
                <SelectItem value="45-54">45-54</SelectItem>
                <SelectItem value="55+">55+</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <label className="block text-xl font-cormorant">Gender</label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger>
              <SelectValue placeholder="Select your gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <label className="block text-xl font-cormorant">Location</label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select your location" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 mt-8">
          <Button onClick={handleSkip} variant="outline" className="flex-1">
            Skip
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Complete
          </Button>
        </div>
      </div>
    </div>
  );
};
