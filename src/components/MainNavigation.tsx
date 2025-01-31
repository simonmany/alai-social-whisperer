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
  showOnlyProfile?: boolean;
}

export const MainNavigation = ({
  onProfileOpen,
  hideButtons = false,
  showOnlyProfile = false,
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
        .select('goals, onboarding_step')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    }
  });

  const { count: missingGoalsCount } = checkMissingGoals(profile?.goals as Goal[]);
  
  // Show contacts button if we're in contactsintro/calendarintro step or tutorial is complete
  const showContactsButton = profile?.onboarding_step === 'contactsintro' || 
                           profile?.onboarding_step === 'calendarintro' || 
                           profile?.onboarding_step === 'complete';

  // Show calendar button if we're in calendarintro step or tutorial is complete
  const showCalendarButton = profile?.onboarding_step === 'calendarintro' || 
                           profile?.onboarding_step === 'complete';

  if (hideButtons) {
    return null;
  }

  return (
    <div className="flex justify-between items-center gap-2 mb-6">
      <div className="flex-1">
        {!showOnlyProfile && showCalendarButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/calendar')}
          >
            <Calendar className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex-1 flex justify-center">
        {showContactsButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/contacts')}
          >
            <Users className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex-1 flex justify-end">
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onProfileOpen}
            aria-label="Open profile"
          >
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
    </div>
  );
};