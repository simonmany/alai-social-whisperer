import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContactDetailsProps {
  contactId: string;
  onBack: () => void;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  meeting_story: string | null;
}

export const ContactDetails = ({ contactId, onBack }: ContactDetailsProps) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchContact = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) {
        console.error('Error fetching contact:', error);
        return;
      }

      setContact(data);
    };

    fetchContact();
  }, [contactId]);

  const handleDelete = async () => {
    if (!contact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id);

      if (error) throw error;

      toast({
        title: "Contact deleted",
        description: "The contact has been deleted successfully."
      });

      onBack();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "There was an error deleting the contact.",
        variant: "destructive"
      });
    }
  };

  if (!contact) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{contact.name}</h2>
          
          {contact.email && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p>{contact.email}</p>
            </div>
          )}
          
          {contact.phone && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
              <p>{contact.phone}</p>
            </div>
          )}
          
          {contact.relationship && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Relationship</h3>
              <p>{contact.relationship}</p>
            </div>
          )}
          
          {contact.meeting_story && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">How we met</h3>
              <p>{contact.meeting_story}</p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};