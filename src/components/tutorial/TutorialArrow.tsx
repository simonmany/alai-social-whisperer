import { cn } from "@/lib/utils";

interface TutorialArrowProps {
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  style?: React.CSSProperties;
}

export const TutorialArrow = ({ direction = "up", className, style }: TutorialArrowProps) => {
  const arrowStyles = {
    up: "rotate-0",
    down: "rotate-180",
    left: "-rotate-90",
    right: "rotate-90",
  };

  return (
    <div 
      className={cn(
        "fixed z-50 animate-bounce",
        arrowStyles[direction],
        className
      )}
      style={style}
    >
      <svg 
        width="40" 
        height="40" 
        viewBox="0 0 24 24" 
        fill="none" 
        className="text-primary"
      >
        <path
          d="M12 3L20 11H4L12 3Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};