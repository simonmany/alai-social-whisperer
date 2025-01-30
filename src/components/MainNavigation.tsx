import { Button } from "@/components/ui/button";
import { UserRound, Calendar, Users } from "lucide-react";
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
  hideButtons?: boolean;
}

export const MainNavigation = ({
  onProfileOpen,
  hideButtons = false,
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

  return (
    <div className="flex justify-between items-center gap-2 mb-6">
      {!hideButtons && (
        <>
          <div className="flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/calendar')}
            >
              <Calendar className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/contacts')}
            >
              <Users className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={onProfileOpen}>
                <UserRound className="h-5 w-5" />
                {missingGoalsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
                  >
                    {missingGoalsCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};