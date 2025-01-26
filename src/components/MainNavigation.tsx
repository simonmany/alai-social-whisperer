import { Button } from "@/components/ui/button";
import { Calendar, Users, UserRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Goal } from "@/types/goals";
import { checkMissingGoals } from "@/utils/goalUtils";
import { Badge } from "@/components/ui/badge";

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

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('goals')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    }
  });

  const { count: missingGoalsCount } = checkMissingGoals(profile?.goals as Goal[]);

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
      console.log("[Calendar] Starting Google Calendar connection flow...");
      
      const { data: session } = await supabase.auth.getSession();
      console.log("[Calendar] Current session status:", session ? "Has session" : "No session");
      
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
        console.error("[Calendar] Google auth error:", error);
        toast({
          title: "Error connecting to Google Calendar",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive",
        });
        return;
      }

      console.log("[Calendar] Auth URL generated:", data?.url ? "Yes" : "No");

      if (data?.url) {
        const width = 600;
        const height = 800;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        console.log("[Calendar] Opening auth popup...");
        const newWindow = window.open(
          data.url,
          'googleAuthWindow',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!newWindow) {
          console.error("[Calendar] Popup blocked by browser");
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site to connect your Google Calendar.",
            variant: "destructive",
          });
        } else {
          console.log("[Calendar] Auth popup opened successfully");
        }
      }
      
    } catch (error: any) {
      console.error("[Calendar] Calendar connection error:", error);
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
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={onProfileOpen}>
            <UserRound className="h-5 w-5" />
            {missingGoalsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {missingGoalsCount}
              </Badge>
            )}
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
