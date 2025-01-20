import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

const GoalsDialog = ({ open, onOpenChange, onSubmit }: GoalsDialogProps) => {
  const handleGoalSelect = (goal: string) => {
    onSubmit(`I want to ${goal.toLowerCase()}`);
    onOpenChange(false);
  };

  const goals = [
    "Try a new activity",
    "Meet new people",
    "Catch up with old friends",
    "Plan a gathering or trip",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Yes! I love new goals. What would you like to do?
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          {goals.map((goal) => (
            <Button
              key={goal}
              variant="outline"
              className="text-left h-auto py-4 px-6"
              onClick={() => handleGoalSelect(goal)}
            >
              {goal}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsDialog;