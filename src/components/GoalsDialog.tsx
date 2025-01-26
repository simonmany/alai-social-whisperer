import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";

interface Goal {
  [key: string]: string | boolean; // Make Goal compatible with Json type
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