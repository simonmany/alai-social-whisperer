import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Goal } from "@/types/goals";

interface GoalsSectionProps {
  goals: Goal[];
  onGoalComplete: (index: number) => void;
  onSetNewGoal: () => void;
  missingTimeframes: string[];
}

export const GoalsSection = ({ goals, onGoalComplete, onSetNewGoal, missingTimeframes }: GoalsSectionProps) => {
  const filterGoalsByTimeframe = (timeframe: string) => {
    return goals.filter((goal: Goal) => goal.timeframe === timeframe);
  };

  const renderTimeframeSection = (timeframe: string, title: string) => {
    const timeframeGoals = filterGoalsByTimeframe(timeframe);
    const hasGoals = timeframeGoals.length > 0;

    return (
      <div>
        <h3 className="text-sm font-bold text-primary mb-2">{title}</h3>
        {!hasGoals ? (
          <Alert 
            variant="destructive" 
            className="mb-2 cursor-pointer hover:bg-destructive/90 transition-colors"
            onClick={onSetNewGoal}
          >
            <AlertDescription className="text-sm">
              Goal Missing! Set now?
            </AlertDescription>
          </Alert>
        ) : (
          timeframeGoals.map((goal: Goal, index: number) => (
            <div key={index} className="mb-2 flex items-start gap-2">
              <Checkbox
                checked={goal.completed}
                onCheckedChange={() => onGoalComplete(index)}
                className="mt-1"
              />
              <div>
                <div className={`text-sm font-medium ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {goal.type}
                </div>
                <div className={`text-xs text-muted-foreground ${goal.completed ? 'line-through' : ''}`}>
                  {goal.description}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderTimeframeSection('today', 'Today')}
        {renderTimeframeSection('week', 'This Week')}
        {renderTimeframeSection('month', 'This Month')}
      </CardContent>
    </Card>
  );
};