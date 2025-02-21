
import { Button } from "@/components/ui/button";
import { PersonalityQuestion } from "@/components/PersonalityQuestion";

interface PersonalityQuizProps {
  onComplete: (traits: Record<string, number>, comments: string[]) => void;
}

export const PersonalityQuiz = ({ onComplete }: PersonalityQuizProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Quick Personality Quiz</h2>
      <p>Coming soon...</p>
      <Button onClick={() => onComplete({}, [])}>Skip for now</Button>
    </div>
  );
};
