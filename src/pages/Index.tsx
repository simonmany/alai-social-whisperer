
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import OnboardingFlow from "@/components/OnboardingFlow";
import { ChatContainer } from "@/components/ChatContainer";
import { Contact } from "@/types/contacts";

interface Message {
  content: string;
  isAl: boolean;
  is_secret?: boolean;
  contactInfo?: Contact;
}

const Index = () => {
  const { session } = useAuth();
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessageLoading, setIsMessageLoading] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!session?.user?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        setIsOnboarding(!profile?.onboarding_completed);
        setLoading(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [session?.user?.id]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      content,
      isAl: false
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleOnboardingComplete = () => {
    console.log('Onboarding complete, transitioning to chat...');
    setIsOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Loading...</p>
          <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {isOnboarding ? (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      ) : (
        <ChatContainer 
          messages={messages}
          isLoading={isMessageLoading}
          onSend={handleSendMessage}
          onSuggestedPrompt={handleSuggestedPrompt}
        >
          <></>
        </ChatContainer>
      )}
    </div>
  );
};

export default Index;
