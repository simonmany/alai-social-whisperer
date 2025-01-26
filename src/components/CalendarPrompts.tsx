import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface CalendarPromptsProps {
  onPrompt: (message: string) => void;
  type: "day" | "week" | "month";
}

export const CalendarPrompts = ({ onPrompt, type }: CalendarPromptsProps) => {
  const prompts = {
    day: "Tell me about my day",
    week: "Tell me about my week",
    month: "Tell me about my month"
  };

  return (
    <div className="space-y-4 p-4 border-t">
      <p className="text-sm text-muted-foreground italic text-center">Ask Al about your schedule...</p>
      <div className="flex justify-center w-full">
        <Button
          variant="outline"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          onClick={() => onPrompt(prompts[type])}
        >
          <MessageCircle className="mr-2" />
          About my {type}
        </Button>
      </div>
    </div>
  );
};