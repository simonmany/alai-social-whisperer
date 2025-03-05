import { Button } from "@/components/ui/button";

interface SuggestedPromptProps {
  text: string;
  onClick: () => void;
  className?: string;
}

export const SuggestedPrompt = ({ text, onClick, className }: SuggestedPromptProps) => {
  return (
    <Button
      variant="outline"
      className={`bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors ${className || ''}`}
      onClick={onClick}
    >
      {text}
    </Button>
  );
};