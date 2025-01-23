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
}

export const InterestSelector = ({ 
  onComplete, 
  placeholder = "Type to search activities...",
  minSelections = 3
}: InterestSelectorProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
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

  const handleActivitySelect = (activityName: string) => {
    if (selectedActivities.includes(activityName)) {
      setSelectedActivities(prev => prev.filter(name => name !== activityName));
    } else {
      setSelectedActivities(prev => [...prev, activityName]);
    }
    setSearchTerm("");
    setFilteredActivities([]);
  };

  const handleSubmit = () => {
    if (selectedActivities.length < minSelections) {
      toast({
        title: `Please select at least ${minSelections} activities`,
        description: `You've selected ${selectedActivities.length} so far`,
        variant: "destructive",
      });
      return;
    }
    onComplete(selectedActivities);
  };

  return (
    <div className="space-y-4">
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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

      {selectedActivities.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {selectedActivities.length} selected (minimum {minSelections})
          </p>
          <Button onClick={handleSubmit}>Continue</Button>
        </div>
      )}
    </div>
  );
};