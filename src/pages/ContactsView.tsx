import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ContactsView = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [showTutorialDialog, setShowTutorialDialog] = useState(true);

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step, has_completed_tutorial')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  const isInTutorial = profileData?.onboarding_step === 'contactsintro' && !profileData?.has_completed_tutorial;

  const handleSkipContacts = async () => {
    if (!session?.user?.id) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_step: 'calendarintro' })
        .eq('id', session.user.id);
      
      navigate('/');
    } catch (error) {
      console.error('Error updating tutorial progress:', error);
    }
  };

  const handleConnectContacts = async () => {
    if (!session?.user?.id) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_step: 'calendarintro' })
        .eq('id', session.user.id);
      
      navigate('/');
    } catch (error) {
      console.error('Error updating tutorial progress:', error);
    }
  };

  return (
    <Sheet open={true}>
      <SheetContent
        side="left"
        className="w-full sm:w-[540px] p-0"
        onPointerDownOutside={() => navigate("/")}
      >
        <div className="flex items-center p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">Contacts</h2>
        </div>

        {isInTutorial && (
          <Dialog open={showTutorialDialog} onOpenChange={setShowTutorialDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Welcome to Your Constellation</DialogTitle>
                <DialogDescription>
                  Your relationships are a beautiful Constellation, but right now it's a bit empty.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button onClick={handleConnectContacts}>
                  Connect Contacts
                </Button>
                <Button variant="outline" onClick={handleSkipContacts}>
                  Not Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <div className="p-4">
          <Alert>
            <AlertTitle>No contacts yet</AlertTitle>
            <AlertDescription>
              Start adding contacts to build your network.
            </AlertDescription>
          </Alert>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactsView;