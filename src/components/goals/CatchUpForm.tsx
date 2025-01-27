import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Contact {
  id: string;
  name: string;
  email: string | null;
}

interface CatchUpFormProps {
  friendInput: string;
  onChange: (value: string) => void;
}

export const CatchUpForm = ({ friendInput, onChange }: CatchUpFormProps) => {
  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*');
      
      if (error) throw error;
      return data as Contact[];
    }
  });

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Who would you like to catch up with?</p>
      <Input
        placeholder="Type a name..."
        value={friendInput}
        onChange={(e) => onChange(e.target.value)}
      />
      {contacts && contacts.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Suggestions:</p>
          {contacts.map((contact) => (
            <p
              key={contact.id}
              className="italic cursor-pointer hover:text-foreground"
              onClick={() => onChange(contact.name)}
            >
              • {contact.name}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};