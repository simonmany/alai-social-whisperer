import { Input } from "@/components/ui/input";

interface NewActivityFormProps {
  activityInput: string;
  onChange: (value: string) => void;
}

export const NewActivityForm = ({ activityInput, onChange }: NewActivityFormProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">What would you like to try?</p>
      <Input
        placeholder="Type your activity here..."
        value={activityInput}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};