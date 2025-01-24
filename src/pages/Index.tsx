import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateChatResponse } from "@/utils/openai";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainNavigation } from "@/components/MainNavigation";
import { ChatContainer } from "@/components/ChatContainer";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import Profile from "./Profile";
import PlanningDialog from "@/components/PlanningDialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import GoalsDialog from "@/components/GoalsDialog";
import ContactsDialog from "@/components/ContactsDialog";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  content: string;
  isAl: boolean;
}

const WELCOME_MESSAGE = "Hi! I'm Al, your social life assistant. How can I help you today?";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { content: WELCOME_MESSAGE, isAl: true },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!session?.user.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        setShowOnboarding(!data.onboarding_completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [session?.user.id]);

  const handleGoogleSignIn = async () => {
    try {
      setIsConnectingCalendar(true);
      console.log("Starting Google Calendar connection...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${window.location.origin}/calendar`
        }
      });

      if (error) throw error;
      
    } catch (error: any) {
      console.error("Calendar connection error:", error);
      toast({
        title: "Error connecting to Google Calendar",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setIsConnectingCalendar(false);
    }
  };

  const handleSend = async (content: string) => {
    setMessages((prev) => [...prev, { content, isAl: false }]);
    setIsLoading(true);

    try {
      const response = await generateChatResponse(content);
      setMessages((prev) => [...prev, { content: response, isAl: true }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

  const containerClasses = isMobile
    ? "min-h-screen bg-black flex flex-col"
    : "min-h-screen bg-gray-50 flex flex-col";

  const contentClasses = isMobile
    ? "flex-1 container max-w-2xl py-8 flex flex-col bg-gray-50 h-[calc(100vh-8rem)] my-16"
    : "flex-1 container max-w-2xl py-8 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        <MainNavigation
          isConnectingCalendar={isConnectingCalendar}
          onProfileOpen={() => setIsProfileOpen(true)}
          onGoogleSignIn={handleGoogleSignIn}
        />
        
        {showOnboarding ? (
          <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
        ) : (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            onSuggestedPrompt={handleSuggestedPrompt}
          />
        )}
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
    </div>
  );
};

export default Index;
