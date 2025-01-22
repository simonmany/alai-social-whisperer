import { Button } from "@/components/ui/button";
import { Calendar, Users, UserRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface MainNavigationProps {
  isConnectingCalendar: boolean;
  onProfileOpen: () => void;
  onGoogleSignIn: () => void;
}

export const MainNavigation = ({
  isConnectingCalendar,
  onProfileOpen,
  onGoogleSignIn,
}: MainNavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleGoogleCalendarConnect = async () => {
    try {
      console.log("Starting Google Calendar connection...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true
        }
      });

      if (error) {
        console.error("Google auth error:", error);
        toast({
          title: "Error connecting to Google Calendar",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        const width = 600;
        const height = 800;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const newWindow = window.open(
          data.url,
          'googleAuthWindow',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!newWindow) {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site to connect your Google Calendar.",
            variant: "destructive",
          });
        }
      }
      
    } catch (error: any) {
      console.error("Calendar connection error:", error);
      toast({
        title: "Error connecting to Google Calendar",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
          <Calendar className="h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          onClick={handleGoogleCalendarConnect}
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
        <Button variant="ghost" size="icon" onClick={onProfileOpen}>
          <UserRound className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};