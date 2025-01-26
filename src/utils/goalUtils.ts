import { Goal } from "@/types/goals";

export const checkMissingGoals = (goals: Goal[] = []) => {
  const timeframes = ['today', 'week', 'month'];
  const missingTimeframes = timeframes.filter(timeframe => 
    !goals.some(goal => goal.timeframe === timeframe)
  );
  
  return {
    missingTimeframes,
    count: missingTimeframes.length
  };
};