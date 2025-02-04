import { cn } from "@/lib/utils";

interface TutorialMessageProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TutorialMessage = ({ children, className, style }: TutorialMessageProps) => {
  return (
    <div 
      className={cn(
        "bg-primary text-primary-foreground p-4 rounded-lg shadow-lg max-w-sm z-50",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};