import { Button } from "@/components/ui/button";

interface SuggestedPromptProps {
  text: string;
  onClick: () => void;
}

export const SuggestedPrompt = ({ text, onClick }: SuggestedPromptProps) => {
  return (
    <Button
      variant="outline"
      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
      onClick={onClick}
    >
      {text}
    </Button>
  );
};