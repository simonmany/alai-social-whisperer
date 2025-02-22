
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TypewriterText } from "@/components/TypewriterText";

interface TutorialOverlayProps {
  onComplete: () => void;
  isProfileOpen?: boolean;
  onPlanningOpen?: () => void;
}

export const TutorialOverlay = ({ onComplete, isProfileOpen, onPlanningOpen }: TutorialOverlayProps) => {
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [hasClickedLetsGo, setHasClickedLetsGo] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, catch_up_contacts')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;

      // Fetch the contact's name if we have a catch_up_contact
      if (data.catch_up_contacts?.[0]) {
        const { data: contactData } = await supabase
          .from('contacts')
          .select('name')
          .eq('id', data.catch_up_contacts[0])
          .single();
        
        return {
          ...data,
          priorityContactName: contactData?.name
        };
      }
      
      return data;
    },
    enabled: !!session?.user?.id
  });

  const handleLetsGo = async () => {
    setHasClickedLetsGo(true);
    
    // Add the "Let's go!" message to chat history
    if (session?.user?.id) {
      await supabase
        .from('chat_history')
        .insert([{
          message: "Let's go!",
          is_ai: false,
          user_id: session.user.id
        }]);
    }

    // Open the planning dialog
    if (onPlanningOpen) {
      setTimeout(() => {
        onPlanningOpen();
      }, 500);
    }
  };

  const renderTutorialContent = () => {
    if (!profile) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="max-w-xl space-y-8 p-8">
          <div className="relative space-y-6">
            <div className="min-h-[4rem]">
              {!hasPlayedLine1 && (
                <TypewriterText
                  text={`Hey ${profile.display_name}. Thanks for taking the time to check me out - it means you care about the quality of your relationships and living a full life.`}
                  delay={250}
                  typingSpeed={25}
                  className="text-4xl font-cormorant block"
                  onComplete={() => setHasPlayedLine1(true)}
                />
              )}
              {hasPlayedLine1 && (
                <div className="text-4xl font-cormorant">
                  {`Hey ${profile.display_name}. Thanks for taking the time to check me out - it means you care about the quality of your relationships and living a full life.`}
                </div>
              )}
            </div>
            
            <div className="min-h-[3rem]">
              {hasPlayedLine1 && !hasPlayedLine2 && (
                <TypewriterText
                  text="I don't know you well yet, but I like you already."
                  delay={250}
                  typingSpeed={25}
                  className="text-lg block"
                  onComplete={() => setHasPlayedLine2(true)}
                />
              )}
              {hasPlayedLine2 && (
                <div className="text-lg">
                  I don't know you well yet, but I like you already.
                </div>
              )}
            </div>
            
            <div className="min-h-[3rem]">
              {hasPlayedLine2 && !hasPlayedLine3 && (
                <TypewriterText
                  text={`Let's dive right in and get started planning your first Hang. You mentioned wanting to see ${profile.priorityContactName}. Shall we make that happen?`}
                  delay={250}
                  typingSpeed={25}
                  className="text-lg block"
                  onComplete={() => setHasPlayedLine3(true)}
                />
              )}
              {hasPlayedLine3 && (
                <div className="text-lg">
                  {`Let's dive right in and get started planning your first Hang. You mentioned wanting to see ${profile.priorityContactName}. Shall we make that happen?`}
                </div>
              )}
            </div>

            {hasPlayedLine3 && !hasClickedLetsGo && (
              <Button 
                onClick={handleLetsGo}
                className="w-full mt-4"
                size="lg"
              >
                Let's go!
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    renderTutorialContent(),
    document.body
  );
};
