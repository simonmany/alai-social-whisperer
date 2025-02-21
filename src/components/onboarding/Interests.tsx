
import { Button } from "@/components/ui/button";

interface InterestsProps {
  onComplete: (currentInterests: string[], desiredInterests: string[]) => void;
}

export const Interests = ({ onComplete }: InterestsProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Your Interests</h2>
      <p>Coming soon...</p>
      <Button onClick={() => onComplete([], [])}>Skip for now</Button>
    </div>
  );
};
