import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database, Json } from "@/integrations/supabase/types";
import { GoalTypeSelector } from "./goals/GoalTypeSelector";
import { NewActivityForm } from "./goals/NewActivityForm";
import { MeetPeopleForm } from "./goals/MeetPeopleForm";
import { CatchUpForm } from "./goals/CatchUpForm";
import { TimeframeSelector } from "./goals/TimeframeSelector";

interface Goal {
  type: string;
  description: string;
  timeframe: string;
  completed: boolean;
  created_at: string;
}

type Profile = Database['public']['Tables']['profiles']['Row'];

interface GoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

const GoalsDialog = ({ open, onOpenChange, onSubmit }: GoalsDialogProps) => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [activityInput, setActivityInput] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [friendInput, setFriendInput] = useState("");
  const [timeframe, setTimeframe] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('goals')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    }
  });

  const handleGoalSelect = async (goalType: string) => {
    if (goalType === "try something new" || goalType === "Meet new people" || goalType === "Catch up with old friends") {
      setSelectedGoal(goalType);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newGoal: Goal = {
        type: "Connection",
        description: goalType.toLowerCase(),
        timeframe: "today",
        completed: false,
        created_at: new Date().toISOString()
      };

      const currentGoals = (profile?.goals as unknown as Goal[]) || [];
      const updatedGoals = [...currentGoals, newGoal];

      const { error } = await supabase
        .from('profiles')
        .update({ goals: updatedGoals as unknown as Json[] })
        .eq('id', user.id);

      if (!error) {
        onSubmit(`I want to ${goalType.toLowerCase()}`);
        onOpenChange(false);
      }
    }
  };

  const handleBack = () => {
    setSelectedGoal(null);
    setActivityInput("");
    setPeopleCount("");
    setFriendInput("");
    setTimeframe(null);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let description = "";
    let type = "";

    if (selectedGoal === "try something new") {
      description = activityInput || "a new activity";
      type = "Activity";
    } else if (selectedGoal === "Meet new people") {
      const count = parseInt(peopleCount) || 1;
      description = `meet ${count} new ${count === 1 ? 'person' : 'people'}`;
      type = "Social";
    } else if (selectedGoal === "Catch up with old friends") {
      description = friendInput || "catch up with a friend";
      type = "Social";
    }

    const timeframeMap: { [key: string]: string } = {
      "ASAP": "today",
      "this week": "week",
      "this month": "month"
    };

    const newGoal: Goal = {
      type,
      description,
      timeframe: timeframeMap[timeframe || ""] || "today",
      completed: false,
      created_at: new Date().toISOString()
    };

    const currentGoals = (profile?.goals as unknown as Goal[]) || [];
    const updatedGoals = [...currentGoals, newGoal];

    const { error } = await supabase
      .from('profiles')
      .update({ goals: updatedGoals as unknown as Json[] })
      .eq('id', user.id);

    if (!error) {
      if (selectedGoal === "try something new") {
        onSubmit(activityInput ? `I want to try ${description}` : "Can you suggest a new activity for me to try?");
      } else if (selectedGoal === "Meet new people") {
        onSubmit(`I want to ${description}`);
      } else if (selectedGoal === "Catch up with old friends") {
        onSubmit(friendInput ? `I want to catch up with ${friendInput}` : "Can you suggest someone I should catch up with?");
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          {selectedGoal ? (
            <Button
              variant="ghost"
              className="w-fit p-2 absolute left-4 top-4"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <DialogTitle className="text-center text-xl">
            {selectedGoal ? `Let's ${selectedGoal}!` : "Yes! I love new goals. What would you like to do?"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          {!selectedGoal ? (
            <GoalTypeSelector onSelect={handleGoalSelect} />
          ) : (
            <div className="space-y-6">
              {selectedGoal === "try something new" && (
                <NewActivityForm
                  activityInput={activityInput}
                  onChange={setActivityInput}
                />
              )}

              {selectedGoal === "Meet new people" && (
                <MeetPeopleForm
                  peopleCount={peopleCount}
                  onChange={setPeopleCount}
                />
              )}

              {selectedGoal === "Catch up with old friends" && (
                <CatchUpForm
                  friendInput={friendInput}
                  onChange={setFriendInput}
                />
              )}
              
              <TimeframeSelector
                selectedGoal={selectedGoal}
                timeframe={timeframe}
                onSelect={setTimeframe}
              />

              <Button 
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  !timeframe || 
                  (selectedGoal === "Meet new people" && (!peopleCount || parseInt(peopleCount) < 1 || parseInt(peopleCount) > 10))
                }
              >
                {selectedGoal === "try something new" && !activityInput 
                  ? "Suggest something" 
                  : selectedGoal === "Catch up with old friends" && !friendInput
                  ? "Suggest someone"
                  : "Submit"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsDialog;