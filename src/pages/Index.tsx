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
import { Redo } from "lucide-react";
import Profile from "./Profile";
import PlanningDialog from "@/components/PlanningDialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import GoalsDialog from "@/components/GoalsDialog";
import ContactsDialog from "@/components/ContactsDialog";
import { useAuth } from "@/components/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { REDIRECT_URL } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

interface Message {
  content: string;
  isAl: boolean;
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

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

  useEffect(() => {
    const state = location.state as { prompt?: string };
    if (state?.prompt) {
      handleSend(state.prompt);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      // Verify the message is from our popup
      if (event.data?.type === 'GOOGLE_SIGN_IN_SUCCESS') {
        console.log("Received success message from popup");
        try {
          // Force a session refresh
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          
          if (session) {
            console.log("Session refreshed successfully, navigating to home");
            navigate("/");
          } else {
            throw new Error("No session after refresh");
          }
        } catch (error: any) {
          console.error("Error refreshing session:", error);
          toast({
            title: "Error signing in",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, toast]);

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return false;
    }
    setPasswordError("");
    return true;
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Google Calendar connection...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: REDIRECT_URL
        }
      });
      
      if (error) throw error;
      
      supabase.functions.invoke('store_auth', {
        body: { name: data }
      });

    } catch (error: any) {
      console.error("Google auth error:", error);
      toast({
        title: "Error signing in with Google",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(password)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            avatar_url: null, // Initialize avatar_url as null
          },
        },
      });

      if (error) {
        // Parse the error message from the response body if it exists
        let errorBody: any = {};
        try {
          errorBody = error.message ? JSON.parse(error.message) : {};
        } catch (parseError) {
          console.error("Error parsing error message:", parseError);
        }

        const isUserExists = error.status === 422 || 
                              errorBody?.code === "user_already_exists" ||
                              error.message.includes("User already registered");

        if (isUserExists) {
          console.log("User already exists, attempting sign in");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            throw signInError;
          }

          // After successful sign in, update the profile with Google data if available
          if (signInData.user?.app_metadata?.provider === 'google') {
            const { user_metadata } = signInData.user;
            await supabase
              .from('profiles')
              .update({
                avatar_url: user_metadata.avatar_url,
                display_name: user_metadata.full_name,
              })
              .eq('id', signInData.user.id);
          }

          toast({
            title: "Welcome back!",
            description: "You've been signed in with your existing account.",
          });
          navigate("/");
          return;
        }
        throw error;
      }

      setShowEmailConfirmation(true);
      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
      
      // Auto-navigate if email confirmation is disabled in Supabase
      if (data.user && !data.user.confirmed_at) {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setShowEmailConfirmation(true);
          throw new Error("Please confirm your email before signing in. Check your inbox for the confirmation link.");
        }
        throw error;
      }

      // After successful sign in, update the profile with Google data if available
      if (data.user?.app_metadata?.provider === 'google') {
        const { user_metadata } = data.user;
        await supabase
          .from('profiles')
          .update({
            avatar_url: user_metadata.avatar_url,
            display_name: user_metadata.full_name,
          })
          .eq('id', data.user.id);
      }
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (content: string) => {
    if (!session?.user.id) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return;
    }

    setMessages(prev => [...prev, { content, isAl: false }]);
    setIsLoading(true);

    try {
      const response = await generateChatResponse(content);
      setMessages(prev => [...prev, { content: response, isAl: true }]);
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

  const containerClasses = isMobile
    ? "min-h-screen bg-black flex flex-col"
    : "min-h-screen bg-gray-50 flex flex-col";

  const contentClasses = isMobile
    ? "flex-1 container max-w-2xl py-8 flex flex-col bg-gray-50 h-[calc(100vh-8rem)] my-16"
    : "flex-1 container max-w-2xl py-8 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-2xl py-4">
          <MainNavigation
            isConnectingCalendar={isConnectingCalendar}
            setIsConnectingCalendar={setIsConnectingCalendar}
            onProfileOpen={() => setIsProfileOpen(true)}
            onGoogleSignIn={handleGoogleSignIn}
          />
        </div>
      </div>

      <div className={contentClasses}>
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

      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 left-4 gap-2"
        onClick={() => setShowOnboarding(true)}
      >
        <Redo className="h-4 w-4" />
        Restart Onboarding
      </Button>

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
