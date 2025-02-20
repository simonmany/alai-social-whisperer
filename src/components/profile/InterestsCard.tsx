
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface InterestsCardProps {
  currentInterests?: string[];
  desiredInterests?: string[];
  foodPreferences?: string[];
  desiredFoodPreferences?: string[];
  musicPreferences?: string[];
  desiredMusicPreferences?: string[];
  onUpdate?: (currentInterests: string[], desiredInterests: string[]) => Promise<void>;
}

export const InterestsCard = ({
  currentInterests = [],
  desiredInterests = [],
  foodPreferences = [],
  desiredFoodPreferences = [],
  musicPreferences = [],
  desiredMusicPreferences = [],
  onUpdate,
}: InterestsCardProps) => {
  const renderInterestSection = (title: string, interests: string[]) => {
    if (!interests.length) return null;
    
    return (
      <div className="mb-4 last:mb-0">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Interests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-primary mb-4">Current</h3>
          {renderInterestSection("Activities", currentInterests)}
          {renderInterestSection("Food", foodPreferences)}
          {renderInterestSection("Music", musicPreferences)}
        </div>
        
        <div>
          <h3 className="text-sm font-bold text-primary mb-4">Want to Try</h3>
          {renderInterestSection("Activities", desiredInterests)}
          {renderInterestSection("Food", desiredFoodPreferences)}
          {renderInterestSection("Music", desiredMusicPreferences)}
        </div>
      </CardContent>
    </Card>
  );
};
