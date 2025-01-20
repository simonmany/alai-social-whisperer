import { useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SuggestedPrompt } from "@/components/SuggestedPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import { Calendar, Users, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Profile from "./Profile";
import PlanningDialog from "@/components/PlanningDialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import GoalsDialog from "@/components/GoalsDialog";
import ContactsDialog from "@/components/ContactsDialog";

interface Message {
  content: string;
  isAl: boolean;
}

const WELCOME_MESSAGE = "Hi! I'm Al, your social life assistant. How can I help you today?";

export const PageContainer = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const containerClasses = isMobile
    ? "min-h-screen bg-black flex flex-col"
    : "min-h-screen bg-gray-50 flex flex-col";
  const contentClasses = isMobile
    ? "flex-1 container max-w-2xl py-8 flex flex-col bg-gray-50 h-[calc(100vh-8rem)] my-16"
    : "flex-1 container max-w-2xl py-8 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>{children}</div>
    </div>
  );
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { content: WELCOME_MESSAGE, isAl: true },
  ]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSend = (content: string) => {
    setMessages((prev) => [...prev, { content, isAl: false }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { content: "I'm still learning, but I'd love to help with that!", isAl: true },
      ]);
    }, 1000);
  };

  const handlePlanSubmit = (activity: string, contact: string, time: string) => {
    const message = `I want to ${activity} with ${contact} at ${time}`;
    handleSend(message);
    setIsPlanningOpen(false);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (prompt === "plan me a hang") {
      setIsPlanningOpen(true);
    } else if (prompt === "talk about a hang") {
      setIsFeedbackOpen(true);
    } else if (prompt === "Set a new goal") {
      setIsGoalsOpen(true);
    } else if (prompt === "add a new contact") {
      setIsContactsOpen(true);
    } else {
      handleSend(prompt);
    }
  };

  return (
    <PageContainer>
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
              text="talk about a hang"
              onClick={() => handleSuggestedPrompt("talk about a hang")}
            />
            <SuggestedPrompt
              text="Set a new goal"
              onClick={() => handleSuggestedPrompt("Set a new goal")}
            />
            <SuggestedPrompt
              text="add a new contact"
              onClick={() => handleSuggestedPrompt("add a new contact")}
            />
          </div>
        </div>
        <ChatInput onSend={handleSend} />
      </div>
      <Profile open={isProfileOpen} onOpenChange={setIsProfileOpen} />
      <PlanningDialog 
        open={isPlanningOpen} 
        onOpenChange={setIsPlanningOpen}
        onSubmit={handlePlanSubmit}
      />
      <FeedbackDialog
        open={isFeedbackOpen}
        onOpenChange={setIsFeedbackOpen}
        onSubmit={handleSend}
      />
      <GoalsDialog
        open={isGoalsOpen}
        onOpenChange={setIsGoalsOpen}
        onSubmit={handleSend}
      />
      <ContactsDialog
        open={isContactsOpen}
        onOpenChange={setIsContactsOpen}
        onSubmit={handleSend}
      />
    </PageContainer>
  );
};

export default Index;