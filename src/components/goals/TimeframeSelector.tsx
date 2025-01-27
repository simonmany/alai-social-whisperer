import { Button } from "@/components/ui/button";

interface TimeframeSelectorProps {
  selectedGoal: string;
  timeframe: string | null;
  onSelect: (timeframe: string) => void;
}

export const TimeframeSelector = ({ selectedGoal, timeframe, onSelect }: TimeframeSelectorProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {selectedGoal === "try something new" 
          ? "How soon would you like to try this?"
          : selectedGoal === "Meet new people"
          ? "When would you like to meet them?"
          : "When would you like to catch up?"}
      </p>
      <div className="flex gap-2">
        {["ASAP", "this week", "this month"].map((option) => (
          <Button
            key={option}
            variant={timeframe === option ? "default" : "outline"}
            onClick={() => onSelect(option)}
            className="flex-1"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
};