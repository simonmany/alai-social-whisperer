
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateChatResponse } from "@/utils/openai";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainNavigation } from "@/components/MainNavigation";
import { ChatContainer } from "@/components/ChatContainer";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Button } from "@/components/ui/button";
import { Redo, Play, RefreshCw } from "lucide-react";
import Profile from "./Profile";
import PlanningDialog from "@/components/PlanningDialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import GoalsDialog from "@/components/GoalsDialog";
import ContactsDialog from "@/components/ContactsDialog";
import { useAuth } from "@/components/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { Contact } from "@/types/contacts";
import { APP_CONSTANTS } from "@/utils/constants";

interface Message {
  content: string;
  isAl: boolean;
  is_secret?: boolean;
  contactInfo?: Contact;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load initial state
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!session?.user?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        setShowOnboarding(!profile?.onboarding_completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [session?.user?.id]);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!session?.user?.id) return;

      try {
        const { data: messages } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (messages) {
          setMessages(messages.map(msg => ({
            content: msg.message,
            isAl: msg.is_ai,
            is_secret: msg.is_secret
          })));
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [session?.user?.id]);

  const handleSend = async (message: string) => {
    if (!message.trim()) return;
    setIsLoading(true);

    try {
      const response = await generateChatResponse(message);
    } catch (error: any) {
      console.error('Error generating response:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const handleOnboardingComplete = () => {
    console.log('Setting showOnboarding to false');
    setShowOnboarding(false);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-2xl py-4">
          <MainNavigation />
        </div>
      </div>

      <div className="flex-1 container max-w-2xl py-8 flex flex-col mt-20">
        {showOnboarding ? (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        ) : (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            onSuggestedPrompt={handleSuggestedPrompt}
          >
            <></>
          </ChatContainer>
        )}
      </div>
    </div>
  );
};

export default Index;
