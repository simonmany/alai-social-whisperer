import { Button } from "@/components/ui/button";
import { Chat } from "lucide-react";

interface CalendarPromptsProps {
  onPrompt: (message: string) => void;
}

export const CalendarPrompts = ({ onPrompt }: CalendarPromptsProps) => {
  return (
    <div className="space-y-4 p-4 border-t">
      <p className="text-sm text-muted-foreground italic">Ask Al about your schedule...</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          onClick={() => onPrompt("Tell me about my day")}
        >
          <Chat className="mr-2" />
          About my day
        </Button>
        <Button
          variant="outline"
          className="bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          onClick={() => onPrompt("Tell me about my week")}
        >
          <Chat className="mr-2" />
          About my week
        </Button>
        <Button
          variant="outline"
          className="bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          onClick={() => onPrompt("Tell me about my month")}
        >
          <Chat className="mr-2" />
          About my month
        </Button>
      </div>
    </div>
  );
};