import { Button } from "@/components/ui/button";
import { Calendar, Users, UserRound, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Goal } from "@/types/goals";
import { checkMissingGoals } from "@/utils/goalUtils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface MainNavigationProps {
  isConnectingCalendar: boolean;
  onProfileOpen: () => void;
  onGoogleSignIn: () => void;
  hideButtons?: boolean;
  showProfileButton?: boolean;
}

export const MainNavigation = ({
  onProfileOpen,
  hideButtons = false,
  showProfileButton = true,
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

  useEffect(() => {
    console.log("Profile button state:", { showProfileButton });
  }, [showProfileButton]);

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

  // Only hide if explicitly told to hide
  if (hideButtons) {
    console.log("Buttons hidden due to hideButtons prop");
    return null;
  }

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
          <Calendar className="h-5 w-5" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
        <Users className="h-5 w-5" />
      </Button>
      <div className="flex gap-2">
        <div className={cn(
          "relative transition-opacity duration-300",
          showProfileButton ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
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