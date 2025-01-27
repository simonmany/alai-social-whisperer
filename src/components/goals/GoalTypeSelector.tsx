import { Button } from "@/components/ui/button";

interface GoalTypeSelectorProps {
  onSelect: (goalType: string) => void;
}

export const GoalTypeSelector = ({ onSelect }: GoalTypeSelectorProps) => {
  const goals = [
    "try something new",
    "Meet new people",
    "Catch up with old friends",
    "Plan a gathering or trip",
  ];

  return (
    <div className="flex flex-col gap-3">
      {goals.map((goal) => (
        <Button
          key={goal}
          variant="outline"
          className="text-left h-auto py-4 px-6"
          onClick={() => onSelect(goal)}
        >
          {goal}
        </Button>
      ))}
    </div>
  );
};