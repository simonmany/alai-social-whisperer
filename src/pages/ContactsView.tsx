import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { ContactList } from "@/components/contacts/ContactList";
import { ContactDetails } from "@/components/contacts/ContactDetails";

const ContactsView = () => {
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isInTutorial, setIsInTutorial] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  useEffect(() => {
    setIsInTutorial(profile?.onboarding_step === 'contactsopen');
  }, [profile?.onboarding_step]);

  const handleAddContact = async () => {
    if (isInTutorial) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'calendarintro' })
          .eq('id', session?.user.id);
        
        navigate('/');
      } catch (error) {
        console.error('Error updating tutorial step:', error);
      }
    }
    setIsAddContactOpen(true);
  };

  const handleSkipContacts = async () => {
    if (isInTutorial) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'calendarintro' })
          .eq('id', session?.user.id);
        
        navigate('/');
      } catch (error) {
        console.error('Error updating tutorial step:', error);
      }
    }
    navigate('/');
  };

  return (
    <Sheet open={true}>
      <SheetContent
        side="left"
        className="w-full sm:w-[540px] p-0 flex flex-col h-full"
        onPointerDownOutside={() => navigate("/")}
        showCloseButton={false}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipContacts}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">Contacts</h2>
          </div>
          <Button onClick={handleAddContact}>Add Contact</Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedContactId ? (
            <ContactDetails
              contactId={selectedContactId}
              onBack={() => setSelectedContactId(null)}
            />
          ) : (
            <ContactList onContactSelect={setSelectedContactId} />
          )}
        </div>

        <AddContactDialog
          open={isAddContactOpen}
          onOpenChange={setIsAddContactOpen}
        />
      </SheetContent>
    </Sheet>
  );
};

export default ContactsView;