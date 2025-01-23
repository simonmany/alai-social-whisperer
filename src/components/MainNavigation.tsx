import { Button } from "@/components/ui/button";
import { Calendar, Users, UserRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { GoogleCalendarAuth } from "@/components/GoogleCalendarAuth";

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

  return (
    <>
      <GoogleCalendarAuth />
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
            <Calendar className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            onClick={onGoogleSignIn}
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
    </>
  );
};