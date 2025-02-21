
import { Button } from "@/components/ui/button";

interface GoalsProps {
  onComplete: (goals: string[]) => void;
}

export const Goals = ({ onComplete }: GoalsProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Your Goals</h2>
      <p>Coming soon...</p>
      <Button onClick={() => onComplete([])}>Skip for now</Button>
    </div>
  );
};
