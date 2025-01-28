import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isAl: boolean;
  animate?: boolean;
}

export const ChatMessage = ({ content, isAl, animate = true }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "mb-4 max-w-[80%] text-lg", // Added text-lg for larger font size
        isAl ? "self-start" : "self-end",
        animate && (isAl ? "animate-slide-in-left" : "animate-slide-in-right")
      )}
    >
      {isAl ? (
        <div className="text-gray-800 px-4 py-2 rounded-lg bg-transparent">
          {content}
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm">
          {content}
        </div>
      )}
    </div>
  );
};