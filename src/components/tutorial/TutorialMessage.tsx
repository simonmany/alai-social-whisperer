import { cn } from "@/lib/utils";

interface TutorialMessageProps {
  children: React.ReactNode;
  className?: string;
}

export const TutorialMessage = ({ children, className }: TutorialMessageProps) => {
  return (
    <div 
      className={cn(
        "fixed z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg max-w-sm animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
};