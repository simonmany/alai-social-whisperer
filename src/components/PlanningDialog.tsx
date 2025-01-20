import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (activity: string, contact: string, time: string) => void;
}

const PlanningDialog = ({ open, onOpenChange, onSubmit }: PlanningDialogProps) => {
  const [activity, setActivity] = useState("");
  const [contact, setContact] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = () => {
    if (activity && contact && time) {
      onSubmit(activity, contact, time);
      setActivity("");
      setContact("");
      setTime("");
    }
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
              placeholder="Enter an activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">with...</label>
            <Input
              placeholder="Enter a person's name"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">at...</label>
            <Input
              placeholder="Enter a time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!activity || !contact || !time}
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;