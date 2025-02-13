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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { REDIRECT_URL } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";

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

interface Contact {
  name: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meetingStory?: string;
  relationship?: string;
  photo?: string;
}

const WELCOME_MESSAGE = "Hi! I'm Al, your social life assistant. How can I help you today?";

const Index = () => {
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
  const [messages, setMessages] = useState<Message[]>([]);

  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [showProfileButton, setShowProfileButton] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const handleStartTutorial = async () => {
    if (!session?.user.id) return;

    try {
      if (showOnboarding) {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            onboarding_step: 'splash',
            has_completed_tutorial: false
          })
          .eq('id', session.user.id);

        setShowOnboarding(false);
        setTutorialComplete(false);
        setShowProfileButton(false);
      } else {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_step: 'splash',
            has_completed_tutorial: false
          })
          .eq('id', session.user.id);

        setTutorialComplete(false);
        setShowProfileButton(false);
      }
      
      queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
      
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
      setShowProfileButton(false);
      
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

  const handleTestMorningCheckin = async () => {
    if (!session?.user.id) return;
    
    try {
      const { data, error } = await supabase.rpc('schedule_timezone_aware_checkin', {
        user_id: session.user.id,
        target_hour: 7,
        checkin_type: 'morning'
      });
      
      if (error) throw error;
      
      toast({
        title: "Morning check-in triggered",
        description: "The morning check-in function has been executed.",
      });
    } catch (error: any) {
      console.error('Error triggering morning check-in:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger morning check-in",
        variant: "destructive",
      });
    }
  };

  const handleTestEveningCheckin = async () => {
    if (!session?.user.id) return;
    
    try {
      const { data, error } = await supabase.rpc('schedule_timezone_aware_checkin', {
        user_id: session.user.id,
        target_hour: 22,
        checkin_type: 'evening'
      });
      
      if (error) throw error;
      
      toast({
        title: "Evening check-in triggered",
        description: "The evening check-in function has been executed.",
      });
    } catch (error: any) {
      console.error('Error triggering evening check-in:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger evening check-in",
        variant: "destructive",
      });
    }
  };

  const handleTestCompletedEvents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-events');
      
      if (error) throw error;
      
      toast({
        title: "Completed events check triggered",
        description: data?.events_processed 
          ? `Processed ${data.events_processed} events between ${new Date(data.time_window.start).toLocaleString()} and ${new Date(data.time_window.end).toLocaleString()}`
          : "No events found in the specified time window",
      });
    } catch (error: any) {
      console.error('Error checking completed events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to check completed events",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!session?.user.id) return;

      try {
        console.log('Loading chat history for user:', session.user.id);
        
        // Get the start of the current day in UTC
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('created_at', startOfDay)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching chat history:', error);
          throw error;
        }

        console.log('Received chat history:', data);

        if (data && data.length > 0) {
          const historyMessages = data.map(msg => ({
            content: msg.message,
            isAl: msg.is_ai,
          }));
          console.log('Setting messages:', historyMessages);
          setMessages(historyMessages);
        } else {
          console.log('No chat history found, setting welcome message');
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

    // Set up real-time subscription for new messages
    const setupMessagesSubscription = () => {
      if (!session?.user.id) return;

      console.log('Setting up real-time messages subscription');
      
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_history',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('New message received:', payload);
            const newMessage = {
              content: payload.new.message,
              isAl: payload.new.is_ai,
              contacts: payload.new.contact_info
            };
            setMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        console.log('Cleaning up messages subscription');
        supabase.removeChannel(channel);
      };
    };

    loadChatHistory();
    const cleanup = setupMessagesSubscription();

    return () => {
      if (cleanup) cleanup();
    };
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
        
        setShowProfileButton(data.onboarding_step !== 'splash' && data.onboarding_step !== 'initial');
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
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
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

  const handleSend = async (message: string, contactInfo?: Contact) => {
    if (!message.trim()) return;

    setIsLoading(true);

    try {
      const response = await generateChatResponse(message, contactInfo);
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

    const phone = contacts.match(/📱 ([^📸💼🐦]+)/)?.[1]?.trim();
    const instagram = contacts.match(/📸 @([^💼🐦\s]+)/)?.[1]?.trim();
    const linkedin = contacts.match(/💼 ([^🐦\s]+)/)?.[1]?.trim();
    const twitter = contacts.match(/🐦 @([^\s]+)/)?.[1]?.trim();

    if (!phone || !instagram || !linkedin || !twitter) return undefined;
    // If the user did not provide any other information, let the LLM take care of it

    return {
      ...contactInfo,
      phone,
      instagram,
      linkedin,
      twitter,
    };
  };

  const handleOnboardingComplete = async () => {
    if (!session?.user.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: 'splash',
          has_completed_tutorial: false
        })
        .eq('id', session.user.id);

      setShowOnboarding(false);
      setTutorialComplete(false);
      setShowProfileButton(false);
      
      queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
      
      toast({
        title: "Onboarding completed",
        description: "Let's get started with the tutorial!",
      });
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error completing onboarding",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <div className="flex-1 container max-w-2xl py-8 flex flex-col mt-20">
        {showOnboarding ? (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        ) : (
          <>
            {!tutorialComplete && (
              <TutorialOverlay 
                onComplete={handleTutorialComplete} 
                isProfileOpen={isProfileOpen}
                key={isProfileOpen ? 'profile-open' : 'profile-closed'}
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
        
        <div className="h-px bg-border my-2" />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleTestMorningCheckin}
        >
          <Play className="h-4 w-4" />
          Test Morning Check-in
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleTestEveningCheckin}
        >
          <Play className="h-4 w-4" />
          Test Evening Check-in
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleTestCompletedEvents}
        >
          <RefreshCw className="h-4 w-4" />
          Test Completed Events
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
        userId={session?.user.id}
      />
    </div>
  );
};

export default Index;
