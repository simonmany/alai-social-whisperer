import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { User, UserRound, Orbit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  closeness: number;
  relationship?: string;
}

interface ContactGroup {
  id: string;
  name: string;
  emoji?: string;
}

interface ContactGroupMembership {
  contact_id: string;
  group_id: string;
}

const ContactsView = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [memberships, setMemberships] = useState<ContactGroupMembership[]>([]);
  const { session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch contacts
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('*')
          .order('closeness', { ascending: false });

        if (contactsError) throw contactsError;
        setContacts(contactsData || []);

        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('contact_groups')
          .select('*');

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Fetch memberships
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('contact_group_memberships')
          .select('*');

        if (membershipsError) throw membershipsError;
        setMemberships(membershipsData || []);

      } catch (error) {
        toast({
          title: "Error fetching contacts",
          description: "Please try again later",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast]);

  const getContactGroups = (contactId: string) => {
    const membershipIds = memberships
      .filter(m => m.contact_id === contactId)
      .map(m => m.group_id);
    return groups.filter(g => membershipIds.includes(g.id));
  };

  const calculatePosition = (index: number, total: number, closeness: number) => {
    const angle = (index / total) * 2 * Math.PI;
    const radius = (1 - closeness) * 300 + 100; // Closer contacts are nearer to the center
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <div className="min-h-screen bg-[url('/galaxy-background.jpg')] bg-cover bg-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/40" /> {/* Dark overlay */}
      
      {/* Central user avatar */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <User className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Orbital rings */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {[0.25, 0.5, 0.75].map((radius, idx) => (
          <div
            key={idx}
            className="absolute rounded-full border border-white/20"
            style={{
              width: `${radius * 800}px`,
              height: `${radius * 800}px`,
              top: `${-radius * 400}px`,
              left: `${-radius * 400}px`,
            }}
          />
        ))}
      </div>

      {/* Contact orbs */}
      {contacts.map((contact, index) => {
        const pos = calculatePosition(index, contacts.length, contact.closeness || 0.5);
        const contactGroups = getContactGroups(contact.id);

        return (
          <div
            key={contact.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-20"
            style={{
              left: `calc(50% + ${pos.x}px)`,
              top: `calc(50% + ${pos.y}px)`,
            }}
          >
            <div className="group relative">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                <UserRound className="w-8 h-8 text-white" />
              </div>
              
              {/* Contact info tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg min-w-[200px]">
                  <p className="font-semibold">{contact.name}</p>
                  {contact.relationship && (
                    <p className="text-sm text-gray-600">{contact.relationship}</p>
                  )}
                  {/* Group emojis */}
                  <div className="flex gap-1 mt-1">
                    {contactGroups.map((group) => (
                      <span key={group.id} title={group.name}>
                        {group.emoji || '👥'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {contacts.length === 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xl text-center z-30">
          <Orbit className="w-12 h-12 mx-auto mb-4" />
          <p>No contacts found. Start adding some!</p>
        </div>
      )}
    </div>
  );
};

export default ContactsView;