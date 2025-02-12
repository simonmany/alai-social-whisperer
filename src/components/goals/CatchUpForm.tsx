
import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";

interface CatchUpFormProps {
  friendInput: string;
  onChange: (value: string) => void;
}

export const CatchUpForm = ({ friendInput, onChange }: CatchUpFormProps) => {
  const [contactInput, setContactInput] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', contactInput],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .ilike('name', `%${contactInput}%`)
        .order('name');

      if (error) throw error;
      
      return data.map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: contactInput.length > 0
  });

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    onChange(contact.name);
    setContactInput('');
  };

  const handleRemoveContact = () => {
    setSelectedContact(null);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Who would you like to catch up with?</p>
      <div className="relative">
        <Input
          placeholder="Type to search contacts..."
          value={contactInput}
          onChange={(e) => setContactInput(e.target.value)}
          className="h-8"
        />
        {contactInput && contacts.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[120px] overflow-y-auto">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="px-2 py-1 hover:bg-accent cursor-pointer flex items-center gap-2"
                onClick={() => handleContactSelect(contact)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{contact.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedContact && (
        <div className="flex flex-wrap gap-1 mt-1">
          <div className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[10px]">
                {getInitials(selectedContact.name)}
              </AvatarFallback>
            </Avatar>
            <span>{selectedContact.name}</span>
            <button
              onClick={handleRemoveContact}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
