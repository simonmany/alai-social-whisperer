
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Contact } from "@/types/contacts";

interface ContactsComboboxProps {
  value: Contact | null;
  onValueChange: (contact: Contact | null) => void;
}

export const ContactsCombobox = ({ value, onValueChange }: ContactsComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    const loadContacts = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name');
        
        if (data && !error) {
          setContacts(data);
        }
      }
    };

    loadContacts();
  }, [session?.user?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? value.name : "Select a contact..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandEmpty>No contact found.</CommandEmpty>
          <CommandGroup>
            {contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                onSelect={() => {
                  onValueChange(contact);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value?.id === contact.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {contact.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
