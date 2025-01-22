import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Calendar, Users, UserRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SuggestedPrompt } from "@/components/SuggestedPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import Profile from "./Profile";
import PlanningDialog from "@/components/PlanningDialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import GoalsDialog from "@/components/GoalsDialog";
import ContactsDialog from "@/components/ContactsDialog";
import { generateChatResponse } from "@/utils/openai";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Clean up auth window on unmount
  useEffect(() => {
    return () => {
      if (authWindow) {
        authWindow.close();
      }
    };
  }, [authWindow]);

  useEffect(() => {
    console.log('Setting up message listener');
    
    const handleMessage = async (event: MessageEvent) => {
      console.log('Received message:', event.data);
      
      // Only handle messages from our popup
      if (event.data === 'google-auth-success') {
        console.log('Received auth success message');
        
        try {
          // Get the latest session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            throw sessionError;
          }

          if (session) {
            console.log('Session refreshed successfully');
            // Close the popup window if it's still open
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            setAuthWindow(null);
            setIsConnectingCalendar(false);
            navigate('/calendar');
          }
        } catch (error) {
          console.error('Error handling auth success:', error);
          toast({
            title: "Error connecting to Google Calendar",
            description: "Please try again",
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      console.log('Cleaning up message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate, toast, authWindow]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast({
          title: "Error signing out",
          description: "Please try again",
          variant: "destructive",
        });
      }
      navigate("/auth");
    } catch (error: any) {
      console.error("Sign out error:", error);
      navigate("/auth");
    }
  };

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

      if (error) {
        throw error;
      }
      
      if (data?.url) {
        // Open auth in a popup window
        const width = 600;
        const height = 800;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'google-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (popup) {
          setAuthWindow(popup);
          // Poll for window closure
          const checkWindow = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkWindow);
              setAuthWindow(null);
              setIsConnectingCalendar(false);
            }
          }, 500);
        } else {
          throw new Error('Popup blocked by browser');
        }
      }
      
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
              <Calendar className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGoogleSignIn}
              disabled={isConnectingCalendar}
              className="flex items-center gap-2"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-4 h-4"
              />
              {isConnectingCalendar ? "Connecting..." : "Connect Calendar"}
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <Users className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsProfileOpen(true)}>
              <UserRound className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
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
          {isLoading && (
            <div className="self-start text-sm text-gray-500 animate-pulse">
              Al is typing...
            </div>
          )}
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