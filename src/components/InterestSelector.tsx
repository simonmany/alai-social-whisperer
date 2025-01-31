import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  name: string;
  category: string | null;
}

interface InterestSelectorProps {
  onComplete: (selectedInterests: string[]) => void;
  placeholder?: string;
  minSelections?: number;
  initialSelections?: string[];
}

export const InterestSelector = ({ 
  onComplete, 
  placeholder = "Type to search or add new activities...",
  minSelections = 1,
  initialSelections = []
}: InterestSelectorProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(initialSelections);
  const { toast } = useToast();

  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('name');
      
      if (error) {
        toast({
          title: "Error fetching activities",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setActivities(data);
    };

    fetchActivities();
  }, [toast]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = activities.filter(activity =>
        activity.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredActivities(filtered);
    } else {
      setFilteredActivities([]);
    }
  }, [searchTerm, activities]);

  useEffect(() => {
    // Call onComplete whenever selections change
    onComplete(selectedActivities);
  }, [selectedActivities, onComplete]);

  const handleActivitySelect = (activityName: string) => {
    if (selectedActivities.includes(activityName)) {
      setSelectedActivities(prev => prev.filter(name => name !== activityName));
    } else {
      setSelectedActivities(prev => [...prev, activityName]);
    }
    setSearchTerm("");
    setFilteredActivities([]);
  };

  const validateActivityName = (name: string): boolean => {
    const sqlPatterns = [
      /(\b(select|insert|update|delete|drop|union|exec|declare|alter)\b)|(--)|(;)|(\/\*|\*\/)|(')/gi,
      /(\b(table|database|schema)\b)/gi,
      /(\b(waitfor|delay|sleep)\b)/gi
    ];

    return !sqlPatterns.some(pattern => pattern.test(name));
  };

  const createNewActivity = async (name: string) => {
    if (!validateActivityName(name)) {
      toast({
        title: "Invalid activity name",
        description: "Please enter a valid activity name without special characters",
        variant: "destructive",
      });
      return null;
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9\s\-_.,!?]/g, '').trim();
    
    if (sanitizedName !== name) {
      toast({
        title: "Activity name modified",
        description: "Some special characters were removed for security",
        variant: "default",
      });
    }

    const { data, error } = await supabase
      .from('activities')
      .insert({ name: sanitizedName })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating activity",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setActivities(prev => [...prev, data]);
    return data;
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const inputValue = searchTerm.trim();
      if (!inputValue) return;

      const newActivities = inputValue.split(',').map(act => act.trim()).filter(Boolean);

      for (const activityName of newActivities) {
        if (!activityName) continue;

        const existingActivity = activities.find(
          a => a.name.toLowerCase() === activityName.toLowerCase()
        );

        if (existingActivity) {
          if (!selectedActivities.includes(existingActivity.name)) {
            setSelectedActivities(prev => [...prev, existingActivity.name]);
          }
        } else {
          const newActivity = await createNewActivity(activityName);
          if (newActivity) {
            setSelectedActivities(prev => [...prev, newActivity.name]);
          }
        }
      }

      setSearchTerm("");
      setFilteredActivities([]);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
      />
      
      {filteredActivities.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
          {filteredActivities.map((activity) => (
            <Button
              key={activity.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleActivitySelect(activity.name)}
            >
              {activity.name}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {selectedActivities.map((activity) => (
          <Button
            key={activity}
            variant="secondary"
            onClick={() => handleActivitySelect(activity)}
            className="group"
          >
            {activity}
            <span className="ml-2 opacity-0 group-hover:opacity-100">×</span>
          </Button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {selectedActivities.length} selected (minimum {minSelections})
        </p>
      </div>
    </div>
  );
};