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
import { Redo, Play } from "lucide-react";
import Profile from "./Profile";
import PlanningDialog from "@/components/PlanningDialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import GoalsDialog from "@/components/GoalsDialog";
import ContactsDialog from "@/components/ContactsDialog";
import { useAuth } from "@/components/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { ContactCard } from "@/components/ContactCard";

interface Message {
  content: string;
  isAl: boolean;
  contacts?: {
    name: string;
    phone?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    meetingStory?: string;
    relationship?: string;
  }[];
}

const WELCOME_MESSAGE = "Hi! I'm Al, your social life assistant. How can I help you today?";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [showProfileButton, setShowProfileButton] = useState(false);
  const [hideButtons, setHideButtons] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const handleStartTutorial = async () => {
    if (!session?.user.id) return;

    try {
      // If user is in onboarding, mark it as completed first
      if (showOnboarding) {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            onboarding_step: 'initial',
            has_completed_tutorial: false
          })
          .eq('id', session.user.id);

        setShowOnboarding(false);
        setTutorialComplete(false);
        setHideButtons(false);
        setShowProfileButton(true);
      } else {
        // Just restart the tutorial
        await supabase
          .from('profiles')
          .update({ 
            onboarding_step: 'initial',
            has_completed_tutorial: false
          })
          .eq('id', session.user.id);

        setTutorialComplete(false);
        setShowProfileButton(true);
      }
      
      toast({
        title: "Tutorial started",
        description: "Follow the instructions to learn how to use the app!",
      });
    } catch (error: any) {
      console.error('Error starting tutorial:', error);
      toast({
        title: "Error starting tutorial",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSkipOnboarding = async () => {
    if (!session?.user.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          has_completed_tutorial: true,
          onboarding_step: 'complete'
        })
        .eq('id', session.user.id);

      setShowOnboarding(false);
      setTutorialComplete(true);
      setHideButtons(false);
      
      toast({
        title: "Onboarding skipped",
        description: "You can restart onboarding using the button in the bottom left",
      });
    } catch (error: any) {
      console.error('Error skipping onboarding:', error);
      toast({
        title: "Error skipping onboarding",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!session?.user.id) return;

      try {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching chat history:', error);
          throw error;
        }

        if (data && data.length > 0) {
          const historyMessages = data.map(msg => ({
            content: msg.message,
            isAl: msg.is_ai
          }));
          setMessages(historyMessages);
        } else {
          setMessages([{ content: WELCOME_MESSAGE, isAl: true }]);
        }
      } catch (error: any) {
        console.error('Error loading chat history:', error);
        toast({
          title: "Error loading chat history",
          description: error.message || "Please try refreshing the page",
          variant: "destructive",
        });
      }
    };

    loadChatHistory();
  }, [session?.user.id, toast]);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!session?.user.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_tutorial, onboarding_completed, onboarding_step')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        console.log('Tutorial status check:', {
          hasCompletedTutorial: data.has_completed_tutorial,
          onboardingCompleted: data.onboarding_completed,
          onboardingStep: data.onboarding_step
        });

        setTutorialComplete(!!data.has_completed_tutorial);
        setShowOnboarding(!data.onboarding_completed);
        
        if (data.onboarding_step !== 'initial') {
          setShowProfileButton(true);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };

    checkTutorialStatus();
  }, [session?.user.id]);

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
        setHideButtons(!data.onboarding_completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [session?.user.id]);

  useEffect(() => {
    const state = location.state as { prompt?: string };
    if (state?.prompt) {
      handleSend(state.prompt);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

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

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    // Parse contact information if the message is from ContactsDialog
    const contactInfo = message.startsWith("I met ") ? parseContactInfo(message) : undefined;

    const newMessage: Message = {
      content: message,
      isAl: false,
      contacts: contactInfo ? [contactInfo] : undefined
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const response = await generateChatResponse(message, contactInfo);
      setMessages((prev) => [...prev, { 
        content: response.response, 
        isAl: true,
        contacts: response.contacts
      }]);
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

  const handlePlanSubmit = (message: string) => {
    handleSend(message);
    setIsPlanningOpen(false);
  };

  const handleGoalSubmit = (message: string) => {
    handleSend(message);
    setIsGoalsOpen(false);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
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

  const handleTutorialComplete = () => {
    setTutorialComplete(true);
  };

  const handleRestartOnboarding = async () => {
    if (!session?.user.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: false,
          has_completed_tutorial: false,
          onboarding_step: 'initial',
          personality_traits: {},
          personality_comments: [],
          current_interests: [],
          desired_interests: [],
          goals: [],
          display_name: null,
          age: null,
          city: null,
          languages: [],
          relationship_status: null,
          gender: null,
          occupation: null
        })
        .eq('id', session.user.id);

      setShowOnboarding(true);
      setTutorialComplete(false);
      setHideButtons(true);
      setShowProfileButton(false);
      
      toast({
        title: "Onboarding restarted",
        description: "Let's start fresh!",
      });
    } catch (error: any) {
      console.error('Error restarting onboarding:', error);
      toast({
        title: "Error restarting onboarding",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const parseContactInfo = (message: string) => {
    const nameMatch = message.match(/I met (.+?) (?:at|\.)/);
    const meetingMatch = message.match(/at (.+?)\./);
    const contactsMatch = message.match(/Their contacts are (.+?)\./);
    const relationshipMatch = message.match(/They are\.\.\. (.+)$/);

    if (!nameMatch) return undefined;

    const contacts = contactsMatch?.[1] || "";
    const contactInfo = {
      name: nameMatch[1],
      meetingStory: meetingMatch?.[1],
      relationship: relationshipMatch?.[1],
    };

    // Parse individual contact methods
    const phone = contacts.match(/📱 ([^📸💼🐦]+)/)?.[1]?.trim();
    const instagram = contacts.match(/📸 @([^💼🐦\s]+)/)?.[1]?.trim();
    const linkedin = contacts.match(/💼 ([^🐦\s]+)/)?.[1]?.trim();
    const twitter = contacts.match(/🐦 @([^\s]+)/)?.[1]?.trim();

    return {
      ...contactInfo,
      phone,
      instagram,
      linkedin,
      twitter,
    };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-2xl py-4">
          <MainNavigation
            isConnectingCalendar={isConnectingCalendar}
            onProfileOpen={() => setIsProfileOpen(true)}
            onGoogleSignIn={handleGoogleSignIn}
            hideButtons={hideButtons}
          />
        </div>
      </div>

      <div className="flex-1 container max-w-2xl py-8 flex flex-col mt-20">
        {showOnboarding ? (
          <OnboardingFlow 
            onComplete={() => {
              setShowOnboarding(false);
              setHideButtons(false);
              setShowProfileButton(true);
            }} 
          />
        ) : (
          <>
            {!tutorialComplete && showProfileButton && (
              <TutorialOverlay 
                onComplete={handleTutorialComplete} 
                isProfileOpen={isProfileOpen}
              />
            )}
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              onSend={handleSend}
              onSuggestedPrompt={handleSuggestedPrompt}
              disabled={!tutorialComplete}
            >
              <></>
            </ChatContainer>
          </>
        )}
      </div>

      <div className="fixed bottom-4 left-4 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleStartTutorial}
        >
          <Play className="h-4 w-4" />
          Start Tutorial
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleSkipOnboarding}
        >
          Skip Onboarding (Dev Only)
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRestartOnboarding}
        >
          <Redo className="h-4 w-4" />
          Restart Onboarding
        </Button>
      </div>

      <Profile 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen}
        onSend={handleSend}
      />
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
        onSubmit={handleGoalSubmit}
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