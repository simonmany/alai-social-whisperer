
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TypewriterText } from "@/components/TypewriterText";
import { DragDropContext, Droppable, Draggable } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Goal } from "@/types/goals";

interface RankedGoal extends Goal {
  rank: number;
}

interface GoalRankingSectionProps {
  goals: Goal[];
  onComplete: (rankedGoals: RankedGoal[]) => void;
}

export const GoalRankingSection = ({ goals, onComplete }: GoalRankingSectionProps) => {
  const [hasPlayedText, setHasPlayedText] = useState(false);
  const [rankedGoals, setRankedGoals] = useState<RankedGoal[]>(() =>
    goals.map((goal, index) => ({
      ...goal,
      rank: index
    }))
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setRankedGoals((items) => {
        const oldIndex = items.findIndex((item) => item.type === active.id);
        const newIndex = items.findIndex((item) => item.type === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({
          ...item,
          rank: index
        }));
      });
    }
  };

  const SortableItem = ({ goal }: { goal: RankedGoal }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: goal.type });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 2 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`p-4 mb-2 bg-card border rounded-lg cursor-move flex items-center gap-4 ${
          isDragging ? "shadow-lg" : ""
        }`}
      >
        <div className="text-lg font-semibold text-primary w-8 h-8 flex items-center justify-center border rounded-full">
          {goal.rank + 1}
        </div>
        <div className="flex-1">
          <div className="font-medium">{goal.type}</div>
          <div className="text-sm text-muted-foreground">{goal.description}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-lg">
        {hasPlayedText ? (
          <div>Great. Which of these is most important to you, right now?</div>
        ) : (
          <TypewriterText
            text="Great. Which of these is most important to you, right now?"
            delay={250}
            typingSpeed={25}
            onComplete={() => setHasPlayedText(true)}
          />
        )}
      </div>

      <div className="mt-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <SortableContext
            items={rankedGoals.map(g => g.type)}
            strategy={verticalListSortingStrategy}
          >
            {rankedGoals.map((goal) => (
              <SortableItem key={goal.type} goal={goal} />
            ))}
          </SortableContext>
        </DragDropContext>
      </div>

      <Button 
        onClick={() => onComplete(rankedGoals)}
        className="w-full mt-8"
      >
        Continue
      </Button>
    </div>
  );
};
