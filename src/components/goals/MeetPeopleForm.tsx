import { Input } from "@/components/ui/input";

interface MeetPeopleFormProps {
  peopleCount: string;
  onChange: (value: string) => void;
}

export const MeetPeopleForm = ({ peopleCount, onChange }: MeetPeopleFormProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">How many people would you like to meet? (1-10)</p>
      <Input
        type="number"
        min="1"
        max="10"
        placeholder="Enter a number between 1-10"
        value={peopleCount}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};