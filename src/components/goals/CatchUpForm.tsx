
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      let allContacts: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000; // Supabase's maximum page size

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('name')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Error fetching contacts:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allContacts = [...allContacts, ...data];
          if (count && allContacts.length >= count) {
            hasMore = false;
          }
          page++;
        }
      }

      console.log('Total contacts fetched:', allContacts.length);
      return allContacts as Contact[];
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
