import { cn } from "@/lib/utils";

interface TutorialArrowProps {
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  style?: React.CSSProperties;
}

export const TutorialArrow = ({ direction = "up", className, style }: TutorialArrowProps) => {
  const arrowStyles = {
    up: "",
    down: "rotate-180",
    left: "-rotate-90",
    right: "rotate-90"
  };

  return (
    <div 
      className={cn(
        "fixed animate-bounce pointer-events-none z-[9999] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
      style={style}
    >
      <svg 
        width="40" 
        height="40" 
        viewBox="0 0 24 24" 
        fill="none" 
        className={cn("text-primary", arrowStyles[direction])}
      >
        <path
          d="M12 3L20 11H4L12 3Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};