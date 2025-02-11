
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";

interface CatchUpFormProps {
  friendInput: string;
  onChange: (value: string) => void;
}

export const CatchUpForm = ({ friendInput, onChange }: CatchUpFormProps) => {
  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Use a single query with no limit to get all contacts
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }

      console.log('Total contacts fetched:', data?.length);
      return data as Contact[];
    },
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
