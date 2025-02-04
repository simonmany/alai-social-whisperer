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
        "bg-[#0F172A] text-white p-6 rounded-lg shadow-lg max-w-sm animate-fade-in pointer-events-auto z-[9999]",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};