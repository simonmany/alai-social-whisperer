
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ContactsCombobox } from "@/components/ContactsCombobox";
import { ActivitySelector } from "@/components/ActivitySelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Contact } from "@/types/contacts";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
  defaultContact?: string;
}

const PlanningDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultContact
}: PlanningDialogProps) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const { session } = useAuth();

  useEffect(() => {
    const loadDefaultContact = async () => {
      if (defaultContact && session?.user?.id) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', defaultContact)
          .single();
        
        if (data && !error) {
          const contact = {
            ...data,
            interests: Array.isArray(data.interests) ? data.interests : []
          } as Contact;
          
          setSelectedContact(contact);
          // If the contact has interests, select one randomly
          if (contact.interests && contact.interests.length > 0) {
            const randomActivity = contact.interests[Math.floor(Math.random() * contact.interests.length)];
            setSelectedActivity(randomActivity);
          }
        }
      }
    };

    if (open) {
      loadDefaultContact();
    }
  }, [open, defaultContact, session?.user?.id]);

  const handleSubmit = () => {
    if (!selectedContact) {
      alert("Please select a contact");
      return;
    }

    if (!selectedActivity) {
      alert("Please select an activity");
      return;
    }

    const message = `Plan a hang with ${selectedContact.name} to ${selectedActivity}`;
    onSubmit(message);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan a Hang</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ContactsCombobox
            value={selectedContact}
            onValueChange={setSelectedContact}
          />
          <ActivitySelector
            contact={selectedContact}
            value={selectedActivity}
            onValueChange={setSelectedActivity}
          />
        </div>
        <Button onClick={handleSubmit}>Plan Hang</Button>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;
