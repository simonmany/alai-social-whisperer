import { useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SuggestedPrompt } from "@/components/SuggestedPrompt";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  content: string;
  isAl: boolean;
}

const WELCOME_MESSAGE = "Hi! I'm Al, your social life assistant. How can I help you today?";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { content: WELCOME_MESSAGE, isAl: true },
  ]);
  const isMobile = useIsMobile();

  const handleSend = (content: string) => {
    setMessages((prev) => [...prev, { content, isAl: false }]);
    // Here you would typically handle Al's response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { content: "I'm still learning, but I'd love to help with that!", isAl: true },
      ]);
    }, 1000);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const containerClasses = isMobile
    ? "min-h-screen bg-black flex flex-col"
    : "min-h-screen bg-gray-50 flex flex-col";

  const contentClasses = isMobile
    ? "flex-1 container max-w-2xl py-8 flex flex-col bg-gray-50 h-[calc(100vh-8rem)] my-16"
    : "flex-1 container max-w-2xl py-8 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        <div className="flex-1 flex flex-col overflow-y-auto space-y-4 mb-4">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              content={message.content}
              isAl={message.isAl}
              animate={index === messages.length - 1}
            />
          ))}
        </div>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <SuggestedPrompt
              text="Plan me something"
              onClick={() => handleSuggestedPrompt("Plan me something")}
            />
            <SuggestedPrompt
              text="Talk about my last hang"
              onClick={() => handleSuggestedPrompt("Talk about my last hang")}
            />
            <SuggestedPrompt
              text="Set a new goal"
              onClick={() => handleSuggestedPrompt("Set a new goal")}
            />
          </div>
          <ChatInput onSend={handleSend} />
        </div>
      </div>
    </div>
  );
};

export default Index;