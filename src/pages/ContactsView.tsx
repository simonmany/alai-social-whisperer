import { ContactCard } from "@/components/ContactCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Contact {
  id: string;
  name: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meeting_story?: string;
  relationship?: string;
}

const ContactsView = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*');
      
      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }

      setContacts(data || []);
    };

    fetchContacts();
  }, []);

  return (
    <div className="min-h-screen bg-[url('/galaxy-background.jpg')] bg-cover bg-center p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            name={contact.name}
            phone={contact.phone}
            instagram={contact.instagram}
            linkedin={contact.linkedin}
            twitter={contact.twitter}
            meetingStory={contact.meeting_story}
            relationship={contact.relationship}
          />
        ))}
        {contacts.length === 0 && (
          <div className="col-span-full text-center text-white text-xl">
            No contacts found. Start adding some!
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsView;