
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SuggestedPrompt } from "@/components/SuggestedPrompt";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  content: string;
  isAl: boolean;
  contactInfo?: {
    id: string;
    name: string;
    phone?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    meetingStory?: string;
    relationship?: string;
  };
}

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (content: string) => void;
  onSuggestedPrompt: (prompt: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const ChatContainer = ({
  messages,
  isLoading,
  onSend,
  onSuggestedPrompt,
  disabled = false,
  children,
}: ChatContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Filter out system messages (morning/evening check-in prompts, and post-event prompts)
  const filteredMessages = messages.filter((message, index) => {

    // Check if message is a morning or evening check-in system prompt
    const isCheckInPrompt = !message.isAl && 
                           message.content.includes("You're doing the") && 
                           (message.content.includes("morning check-in") || 
                            message.content.includes("evening recap"));

    // Check if message is a post-event system prompt
    const isPostEventPrompt = !message.isAl &&
                             message.content.includes("just completed") &&
                             message.content.includes("Ask them how it went");

    return !isCheckInPrompt && 
           !isPostEventPrompt;
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={cn(
      "relative flex flex-col h-full min-h-[calc(100vh-12rem)]",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col overflow-y-auto space-y-4 mb-4"
        onScroll={handleScroll}
      >
        {filteredMessages.map((message, index) => (
          <ChatMessage
            key={index}
            content={message.content}
            isAl={message.isAl}
            animate={index === filteredMessages.length - 1}
            contacts={message.contactInfo ? [message.contactInfo] : undefined}
          />
        ))}
        {isLoading && (
          <div className="self-start text-sm text-gray-500 animate-pulse">
            Al is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {showScrollButton && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500 italic">Things we can talk about...</p>
          <div className="flex gap-2 flex-wrap">
            <SuggestedPrompt
              text="plan a future hang"
              onClick={() => onSuggestedPrompt("plan me a hang")}
            />
            <SuggestedPrompt
              text="talk about past hang"
              onClick={() => onSuggestedPrompt("talk about a hang")}
            />
            <SuggestedPrompt
              text="Set a new goal"
              onClick={() => onSuggestedPrompt("Set a new goal")}
            />
            <SuggestedPrompt
              text="add a new contact"
              onClick={() => onSuggestedPrompt("add a new contact")}
            />
          </div>
        </div>
        <ChatInput onSend={onSend} />
        {children}
      </div>
    </div>
  );
};
