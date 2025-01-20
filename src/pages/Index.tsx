import { useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SuggestedPrompt } from "@/components/SuggestedPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import { Calendar, Users, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Profile from "./Profile";

interface Message {
  content: string;
  isAl: boolean;
}

const WELCOME_MESSAGE = "Hi! I'm Al, your social life assistant. How can I help you today?";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { content: WELCOME_MESSAGE, isAl: true },
  ]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

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
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
            <Calendar className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <Users className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsProfileOpen(true)}>
            <UserRound className="h-5 w-5" />
          </Button>
        </div>
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
          <div className="space-y-2">
            <p className="text-sm text-gray-500 italic">Things we can talk about...</p>
            <div className="flex gap-2 flex-wrap">
              <SuggestedPrompt
                text="plan me a hang"
                onClick={() => handleSuggestedPrompt("plan me a hang")}
              />
              <SuggestedPrompt
                text="Talk about my last hang"
                onClick={() => handleSuggestedPrompt("Talk about my last hang")}
              />
              <SuggestedPrompt
                text="Set a new goal"
                onClick={() => handleSuggestedPrompt("Set a new goal")}
              />
              <SuggestedPrompt
                text="add an existing hang"
                onClick={() => handleSuggestedPrompt("add an existing hang")}
              />
            </div>
          </div>
          <ChatInput onSend={handleSend} />
        </div>
      </div>
      <Profile open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </div>
  );
};

export default Index;