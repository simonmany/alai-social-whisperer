import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

const PlanningDialog = ({ open, onOpenChange, onSubmit }: PlanningDialogProps) => {
  const [activity, setActivity] = useState("");
  const [contact, setContact] = useState("");
  const [time, setTime] = useState("");

  const generateMessage = () => {
    const hasActivity = activity.trim() !== "";
    const hasContact = contact.trim() !== "";
    const hasTime = time.trim() !== "";

    // All fields blank
    if (!hasActivity && !hasContact && !hasTime) {
      return "Find me something to do!";
    }

    // Only one field filled
    if (hasActivity && !hasContact && !hasTime) {
      return `I want to ${activity}. Find me a person and a time!`;
    }
    if (!hasActivity && hasContact && !hasTime) {
      return `I want to hang with ${contact}. Find us an activity and a time!`;
    }
    if (!hasActivity && !hasContact && hasTime) {
      return `Find me a hang at ${time}`;
    }

    // Two fields filled
    if (hasActivity && hasContact && !hasTime) {
      return `Find me a time to ${activity} with ${contact}!`;
    }
    if (hasActivity && !hasContact && hasTime) {
      return `Find me someone to ${activity} with at ${time}!`;
    }
    if (!hasActivity && hasContact && hasTime) {
      return `Find me something to do with ${contact} at ${time}!`;
    }

    // All fields filled
    return `I want to ${activity} with ${contact} at ${time}`;
  };

  const handleSubmit = () => {
    const message = generateMessage();
    onSubmit(message);
    setActivity("");
    setContact("");
    setTime("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Plan a Hang</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">I want to...</label>
            <Input
              placeholder="Enter an activity (optional)"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">with...</label>
            <Input
              placeholder="Enter a person's name (optional)"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">at...</label>
            <Input
              placeholder="Enter a time (optional)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;