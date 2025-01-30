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
        "fixed bg-primary text-primary-foreground p-4 rounded-lg shadow-lg max-w-sm animate-fade-in pointer-events-auto",
        className
      )}
      style={{
        ...style,
        zIndex: 100 // Ensure it's above the Sheet component
      }}
    >
      {children}
    </div>
  );
};