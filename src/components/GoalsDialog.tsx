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

  // Fetch contacts for suggestions
  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // This is a placeholder - you'll need to implement the actual contacts fetching
      // based on your data structure
      return [
        { id: 1, name: "Alice Johnson" },
        { id: 2, name: "Bob Wilson" },
        { id: 3, name: "Carol Smith" }
      ];
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

  const goals = [
    "try something new",
    "Meet new people",
    "Catch up with old friends",
    "Plan a gathering or trip",
  ];

  const renderContent = () => {
    if (!selectedGoal) {
      return goals.map((goal) => (
        <Button
          key={goal}
          variant="outline"
          className="text-left h-auto py-4 px-6"
          onClick={() => handleGoalSelect(goal)}
        >
          {goal}
        </Button>
      ));
    }

    return (
      <div className="space-y-6">
        {selectedGoal === "try something new" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">What would you like to try?</p>
            <Input
              placeholder="Type your activity here..."
              value={activityInput}
              onChange={(e) => setActivityInput(e.target.value)}
            />
          </div>
        )}

        {selectedGoal === "Meet new people" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">How many people would you like to meet? (1-10)</p>
            <Input
              type="number"
              min="1"
              max="10"
              placeholder="Enter a number between 1-10"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
            />
          </div>
        )}

        {selectedGoal === "Catch up with old friends" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Who would you like to catch up with?</p>
            <Input
              placeholder="Type a name..."
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
            />
            {contacts && contacts.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Suggestions:</p>
                {contacts.map((contact) => (
                  <p
                    key={contact.id}
                    className="italic cursor-pointer hover:text-foreground"
                    onClick={() => setFriendInput(contact.name)}
                  >
                    • {contact.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {selectedGoal === "try something new" 
              ? "How soon would you like to try this?"
              : selectedGoal === "Meet new people"
              ? "When would you like to meet them?"
              : "When would you like to catch up?"}
          </p>
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
    );
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
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsDialog;