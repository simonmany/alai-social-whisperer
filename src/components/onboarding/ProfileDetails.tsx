
import { Button } from "@/components/ui/button";

interface ProfileDetailsProps {
  onComplete: () => void;
}

export const ProfileDetails = ({ onComplete }: ProfileDetailsProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">Profile Details</h2>
      <p>Coming soon...</p>
      <Button onClick={onComplete}>Complete</Button>
    </div>
  );
};
