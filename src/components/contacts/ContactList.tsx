import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Contact {
  id: string;
  name: string;
  email: string | null;
}

interface ContactListProps {
  onContactSelect: (contactId: string) => void;
}

export const ContactList = ({ onContactSelect }: ContactListProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    const fetchContacts = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }

      setContacts(data || []);
    };

    fetchContacts();

    // Subscribe to changes
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts'
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {contacts.length === 0 ? (
          <p className="text-center text-muted-foreground">No contacts yet</p>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onContactSelect(contact.id)}
            >
              <h3 className="font-medium">{contact.name}</h3>
              {contact.email && (
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              )}
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};