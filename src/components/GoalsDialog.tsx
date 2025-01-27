import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database, Json } from "@/integrations/supabase/types";

interface Goal {
  [key: string]: string | boolean;
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
    if (goalType === "try something new") {
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
    setTimeframe(null);
  };

  const handleSubmitActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let description = activityInput;
    if (!description) {
      onSubmit("Can you suggest a new activity for me to try?");
      onOpenChange(false);
      return;
    }

    const timeframeMap: { [key: string]: string } = {
      "ASAP": "today",
      "this week": "week",
      "this month": "month"
    };

    const newGoal: Goal = {
      type: "Activity",
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
      onSubmit(`I want to try ${description}`);
      onOpenChange(false);
    }
  };

  const goals = [
    "try something new",
    "Meet new people",
    "Catch up with old friends",
    "Plan a gathering or trip",
  ];

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
            {selectedGoal ? "Let's try something new!" : "Yes! I love new goals. What would you like to do?"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          {!selectedGoal ? (
            goals.map((goal) => (
              <Button
                key={goal}
                variant="outline"
                className="text-left h-auto py-4 px-6"
                onClick={() => handleGoalSelect(goal)}
              >
                {goal}
              </Button>
            ))
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">What would you like to try?</p>
                <Input
                  placeholder="Type your activity here..."
                  value={activityInput}
                  onChange={(e) => setActivityInput(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">How soon would you like to try this?</p>
                <div className="flex gap-2">
                  {["ASAP", "this week", "this month"].map((option) => (
                    <Button
                      key={option}
                      variant={timeframe === option ? "default" : "outline"}
                      onClick={() => setTimeframe(option)}
                      className="flex-1"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full"
                onClick={handleSubmitActivity}
                disabled={!timeframe}
              >
                {activityInput ? "Submit" : "Suggest something"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsDialog;